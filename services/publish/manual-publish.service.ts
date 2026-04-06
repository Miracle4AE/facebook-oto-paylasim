import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createPublishGroupId } from "@/services/scheduler/scheduler.service";
import { appLogger } from "@/services/logging/app-logger";
import { ContentPostStatus, PublishJobStatus } from "@/types/domain";

export type ManualEnqueueResult =
  | {
      ok: true;
      publishGroupId: string;
      jobIds: string[];
      targetCount: number;
    }
  | {
      ok: false;
      code: "NOT_FOUND" | "NO_TARGETS" | "ALREADY_PUBLISHED" | "QUEUE_BUSY";
      message: string;
    };

/**
 * Aktif hedef kanallar için yayın işleri oluşturur (aynı grup kimliği).
 */
export async function enqueueManualPublishForContent(params: {
  userId: string;
  contentPostId: string;
}): Promise<ManualEnqueueResult> {
  const post = await prisma.contentPost.findFirst({
    where: { id: params.contentPostId, userId: params.userId },
  });
  if (!post) {
    return { ok: false, code: "NOT_FOUND", message: "İçerik bulunamadı." };
  }

  if (post.status === ContentPostStatus.PUBLISHED) {
    return {
      ok: false,
      code: "ALREADY_PUBLISHED",
      message: "Bu içerik zaten yayınlanmış olarak işaretli.",
    };
  }

  const inflight = await prisma.publishJob.count({
    where: {
      contentPostId: params.contentPostId,
      status: {
        in: [PublishJobStatus.PENDING, PublishJobStatus.PROCESSING, PublishJobStatus.RETRY_SCHEDULED],
      },
    },
  });
  if (inflight > 0) {
    return {
      ok: false,
      code: "QUEUE_BUSY",
      message: "Bu içerik için zaten bekleyen veya işlenen bir gönderim var. Bir süre sonra tekrar deneyin.",
    };
  }

  const targets = await prisma.targetChannel.findMany({
    where: { userId: params.userId, isActive: true },
    select: { id: true },
  });
  if (targets.length === 0) {
    return {
      ok: false,
      code: "NO_TARGETS",
      message: "Aktif hedef kanal yok. Önce Hedefler bölümünden en az bir kanal ekleyin.",
    };
  }

  const publishGroupId = createPublishGroupId(`m_${params.contentPostId}`);
  const scheduledFor = new Date();
  const jobIds: string[] = [];

  for (const t of targets) {
    const idempotencyKey = `manual_${params.contentPostId}_${t.id}_${publishGroupId}`;
    const job = await prisma.publishJob.create({
      data: {
        contentPostId: params.contentPostId,
        targetChannelId: t.id,
        scheduleSlotId: null,
        status: PublishJobStatus.PENDING,
        scheduledFor,
        idempotencyKey,
        publishGroupId,
      } as Prisma.PublishJobUncheckedCreateInput,
    });
    jobIds.push(job.id);
  }

  appLogger.info("publish.manual.enqueued", {
    userId: params.userId,
    contentPostId: params.contentPostId,
    publishGroupId,
    targetCount: String(targets.length),
  });

  return {
    ok: true,
    publishGroupId,
    jobIds,
    targetCount: targets.length,
  };
}
