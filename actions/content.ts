"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { contentPostSchema, mediaRecordArraySchema } from "@/lib/validations";
import { commitContentUpdateWithMediaTx, createContentWithMediaTx } from "@/services/content/content-commit.service";
import { deleteUserMediaFile } from "@/services/content/content-media-delete.service";
import type { MediaRecordInput } from "@/services/content/content-media.types";
import { enqueueManualPublishForContent } from "@/services/publish/manual-publish.service";
import { processPendingJobs } from "@/services/scheduler/scheduler.service";
import { appLogger } from "@/services/logging/app-logger";
import { ContentPostStatus } from "@/types/domain";

function revalidateContentPaths(contentPostId: string) {
  revalidatePath("/icerikler");
  revalidatePath(`/icerikler/${contentPostId}`);
  revalidatePath(`/icerikler/${contentPostId}/duzenle`);
  revalidatePath("/zamanlama");
  revalidatePath("/dashboard");
  revalidatePath("/gecmis");
}

function mapPayloadsToMediaRecords(payloads: MediaRecordInput[]): MediaRecordInput[] {
  return payloads.map((p) => ({
    storageKey: p.storageKey,
    publicUrl: p.publicUrl,
    mimeType: p.mimeType,
    kind: p.kind === "VIDEO" ? "VIDEO" : "IMAGE",
    sizeBytes: p.sizeBytes,
  }));
}

export async function createContentPost(input: unknown) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Oturum bulunamadı" };
  const parsed = contentPostSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Geçersiz veri" };
  const data = parsed.data;
  try {
    const post = await prisma.contentPost.create({
      data: {
        userId: user.id,
        title: data.title || null,
        body: data.body,
        status: data.status,
      },
    });
    appLogger.info("content.post.create", { userId: user.id, postId: post.id });
    revalidateContentPaths(post.id);
    return { ok: true as const, id: post.id };
  } catch (e) {
    appLogger.error(
      "content.post.create_failed",
      { userId: user.id },
      e instanceof Error ? e : new Error(String(e)),
    );
    return { ok: false as const, error: "Kayıt oluşturulamadı." };
  }
}

export async function createContentWithMedia(input: unknown, newMedia: unknown) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Oturum bulunamadı" };
  const parsed = contentPostSchema.safeParse(input);
  const mediaParsed = mediaRecordArraySchema.safeParse(newMedia);
  if (!parsed.success || !mediaParsed.success) {
    return { ok: false as const, error: "Geçersiz veri" };
  }
  const data = parsed.data;
  const media = mapPayloadsToMediaRecords(mediaParsed.data);
  if (media.length === 0) {
    return createContentPost(input);
  }
  try {
    const id = await createContentWithMediaTx({
      userId: user.id,
      title: data.title || null,
      body: data.body,
      status: data.status,
      newMedia: media,
    });
    revalidateContentPaths(id);
    return { ok: true as const, id };
  } catch (e) {
    appLogger.error(
      "content.post.create_with_media_failed",
      { userId: user.id },
      e instanceof Error ? e : new Error(String(e)),
    );
    return { ok: false as const, error: "İçerik ve medya kaydedilemedi. Lütfen tekrar deneyin." };
  }
}

export async function updateContentPost(id: string, input: unknown) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Oturum bulunamadı" };
  const parsed = contentPostSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Geçersiz veri" };
  const data = parsed.data;
  const existing = await prisma.contentPost.findFirst({ where: { id, userId: user.id } });
  if (!existing) return { ok: false as const, error: "Kayıt bulunamadı" };
  try {
    await prisma.contentPost.update({
      where: { id },
      data: {
        title: data.title || null,
        body: data.body,
        status: data.status,
      },
    });
    appLogger.info("content.post.update", { userId: user.id, postId: id });
    revalidateContentPaths(id);
    return { ok: true as const };
  } catch (e) {
    appLogger.error(
      "content.post.update_failed",
      { userId: user.id, postId: id },
      e instanceof Error ? e : new Error(String(e)),
    );
    return { ok: false as const, error: "Güncelleme başarısız." };
  }
}

export async function commitContentUpdateWithMedia(postId: string, input: unknown, newMedia: unknown) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Oturum bulunamadı" };
  const parsed = contentPostSchema.safeParse(input);
  const mediaParsed = mediaRecordArraySchema.safeParse(newMedia);
  if (!parsed.success || !mediaParsed.success) {
    return { ok: false as const, error: "Geçersiz veri" };
  }
  const data = parsed.data;
  const media = mapPayloadsToMediaRecords(mediaParsed.data);
  try {
    await commitContentUpdateWithMediaTx({
      userId: user.id,
      postId,
      title: data.title || null,
      body: data.body,
      status: data.status,
      newMedia: media,
    });
    revalidateContentPaths(postId);
    return { ok: true as const };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    if (err.name === "ContentNotFoundError") {
      return { ok: false as const, error: "İçerik bulunamadı." };
    }
    appLogger.error("content.post.commit_update_failed", { userId: user.id, postId }, err);
    return {
      ok: false as const,
      error:
        "Kayıt tamamlanamadı. Yüklenen dosyalar güvenlik için temizlendi; formu kaydederek tekrar deneyebilirsiniz.",
    };
  }
}

export async function deleteContentPost(id: string) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Oturum bulunamadı" };
  const existing = await prisma.contentPost.findFirst({ where: { id, userId: user.id } });
  if (!existing) return { ok: false as const, error: "Kayıt bulunamadı" };
  await prisma.contentPost.delete({ where: { id } });
  revalidatePath("/icerikler");
  revalidatePath(`/icerikler/${id}`);
  revalidatePath("/gecmis");
  return { ok: true as const };
}

/**
 * Aktif hedef kanallar için PublishJob oluşturur, ardından scheduler ile işler.
 * Facebook Graph mock/simülasyonu `facebook-publish.factory` üzerinden yapılır.
 */
export async function publishContentNow(postId: string) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Oturum bulunamadı" };

  const enq = await enqueueManualPublishForContent({ userId: user.id, contentPostId: postId });
  if (!enq.ok) {
    if (enq.code === "ALREADY_PUBLISHED") {
      appLogger.info("content.publish.skipped_already_published", { userId: user.id, postId });
      return {
        ok: true as const,
        result: "already_published" as const,
        message: enq.message,
      };
    }
    return { ok: false as const, error: enq.message };
  }

  try {
    const drainLimit = Math.max(50, enq.targetCount * 4);
    const { processed } = await processPendingJobs(drainLimit);
    appLogger.info("content.publish.manual_tick", {
      userId: user.id,
      postId,
      publishGroupId: enq.publishGroupId,
      jobCount: String(enq.jobIds.length),
      processed: String(processed),
    });
    revalidateContentPaths(postId);
    return {
      ok: true as const,
      result: "queued" as const,
      message: `${enq.targetCount} hedef için yayın kuyruğa alındı. İşleyici ${processed} görev çalıştırdı; sonuçlar geçmişte ve aşağıda görünür.`,
      processed,
    };
  } catch (e) {
    appLogger.error(
      "content.publish.manual_failed",
      { userId: user.id, postId },
      e instanceof Error ? e : new Error(String(e)),
    );
    revalidateContentPaths(postId);
    return {
      ok: false as const,
      error: "Kuyruk oluşturuldu ancak işleme sırasında hata oluştu. Cron veya bir süre sonra tekrar deneyin.",
    };
  }
}

export async function deleteContentMediaFile(mediaId: string) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Oturum bulunamadı" };
  try {
    const { contentPostId } = await deleteUserMediaFile({ userId: user.id, mediaId });
    appLogger.info("content.media.delete", { userId: user.id, mediaId, postId: contentPostId });
    revalidateContentPaths(contentPostId);
    return { ok: true as const };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    if (err.name === "MediaNotFoundError") {
      return { ok: false as const, error: "Medya bulunamadı." };
    }
    appLogger.error("content.media.delete_failed", { userId: user.id, mediaId }, err);
    return { ok: false as const, error: "Medya silinemedi." };
  }
}

export async function setContentStatus(id: string, status: typeof ContentPostStatus[keyof typeof ContentPostStatus]) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Oturum bulunamadı" };
  const existing = await prisma.contentPost.findFirst({ where: { id, userId: user.id } });
  if (!existing) return { ok: false as const, error: "Kayıt bulunamadı" };
  await prisma.contentPost.update({ where: { id }, data: { status } });
  revalidateContentPaths(id);
  return { ok: true as const };
}
