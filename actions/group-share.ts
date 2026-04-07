"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { assertCanStartShareFlow } from "@/services/billing/entitlements.service";
import { ContentGroupShareLogKind } from "@/types/group-share";

const draftSchema = z.object({
  contentPostId: z.string().min(1),
  targetChannelId: z.string().min(1),
  customText: z.string().max(20_000).optional().nullable(),
});

const logSchema = z.object({
  contentPostId: z.string().min(1),
  targetChannelId: z.string().min(1),
  eventKind: z.enum([
    ContentGroupShareLogKind.OPENED,
    ContentGroupShareLogKind.MARKED_DONE,
    ContentGroupShareLogKind.BULK_FLOW_STARTED,
  ]),
});

async function assertContentAndTargetOwned(
  userId: string,
  contentPostId: string,
  targetChannelId: string,
): Promise<boolean> {
  const [post, target] = await Promise.all([
    prisma.contentPost.findFirst({ where: { id: contentPostId, userId }, select: { id: true } }),
    prisma.targetChannel.findFirst({ where: { id: targetChannelId, userId }, select: { id: true } }),
  ]);
  return post != null && target != null;
}

export async function upsertGroupShareDraft(input: unknown) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Oturum bulunamadı" };
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Geçersiz veri" };

  const { contentPostId, targetChannelId, customText } = parsed.data;
  const ok = await assertContentAndTargetOwned(user.id, contentPostId, targetChannelId);
  if (!ok) return { ok: false as const, error: "Kayıt bulunamadı" };

  const text = customText?.trim() ?? "";
  if (text.length === 0) {
    await prisma.contentGroupShareDraft.deleteMany({
      where: { userId: user.id, contentPostId, targetChannelId },
    });
  } else {
    await prisma.contentGroupShareDraft.upsert({
      where: {
        contentPostId_targetChannelId: { contentPostId, targetChannelId },
      },
      create: {
        userId: user.id,
        contentPostId,
        targetChannelId,
        customText: text,
      },
      update: { customText: text },
    });
  }

  revalidatePath(`/icerikler/${contentPostId}`);
  return { ok: true as const };
}

export async function logGroupShareEvent(input: unknown) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Oturum bulunamadı" };
  const parsed = logSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Geçersiz veri" };

  const { contentPostId, targetChannelId, eventKind } = parsed.data;
  const ok = await assertContentAndTargetOwned(user.id, contentPostId, targetChannelId);
  if (!ok) return { ok: false as const, error: "Kayıt bulunamadı" };

  await prisma.contentGroupShareLog.create({
    data: {
      userId: user.id,
      contentPostId,
      targetChannelId,
      eventKind,
    },
  });

  revalidatePath(`/icerikler/${contentPostId}`);
  revalidatePath("/icerikler");
  return { ok: true as const };
}

const bulkOpenedSchema = z.object({
  contentPostId: z.string().min(1),
  targetChannelIds: z.array(z.string().min(1)).min(1).max(20),
});

/**
 * Toplu akış sonrası: bir BULK_FLOW_STARTED + her hedef için OPENED kaydı (tek transaction).
 */
export async function logBulkGroupShareSequence(input: unknown) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Oturum bulunamadı" };
  const parsed = bulkOpenedSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Geçersiz veri" };

  const { contentPostId, targetChannelIds } = parsed.data;

  const flowGate = await assertCanStartShareFlow(user.id);
  if (!flowGate.ok) {
    return { ok: false as const, error: flowGate.message, code: "PLAN_LIMIT" as const };
  }

  const post = await prisma.contentPost.findFirst({
    where: { id: contentPostId, userId: user.id },
    select: { id: true },
  });
  if (!post) return { ok: false as const, error: "İçerik bulunamadı" };

  const targets = await prisma.targetChannel.findMany({
    where: { userId: user.id, id: { in: targetChannelIds } },
    select: { id: true },
  });
  if (targets.length !== targetChannelIds.length) {
    return { ok: false as const, error: "Geçersiz hedef" };
  }

  const first = targetChannelIds[0];
  await prisma.$transaction([
    prisma.contentGroupShareLog.create({
      data: {
        userId: user.id,
        contentPostId,
        targetChannelId: first,
        eventKind: ContentGroupShareLogKind.BULK_FLOW_STARTED,
      },
    }),
    prisma.contentGroupShareLog.createMany({
      data: targetChannelIds.map((targetChannelId) => ({
        userId: user.id,
        contentPostId,
        targetChannelId,
        eventKind: ContentGroupShareLogKind.OPENED,
      })),
    }),
  ]);

  revalidatePath(`/icerikler/${contentPostId}`);
  revalidatePath("/icerikler");
  return { ok: true as const };
}
