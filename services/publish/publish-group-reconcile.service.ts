import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { appLogger } from "@/services/logging/app-logger";
import { ContentPostStatus, PublishJobStatus } from "@/types/domain";

/**
 * Tek iş veya grup tamamlandığında içerik durumunu günceller.
 * - Grup: tüm işler terminal (SUCCESS | FAILED) olunca çalışır.
 * - Eski kayıtlar (publishGroupId yok): tek iş mantığı.
 */
export async function reconcileContentPostAfterPublishJob(jobId: string): Promise<void> {
  const job = (await prisma.publishJob.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      contentPostId: true,
      publishGroupId: true,
      status: true,
    } as Prisma.PublishJobSelect,
  })) as {
    id: string;
    contentPostId: string;
    publishGroupId: string | null;
    status: string;
  } | null;
  if (!job) return;

  if (!job.publishGroupId) {
    await reconcileLegacySingleJob(job.contentPostId, job.status);
    return;
  }

  const groupJobs = await prisma.publishJob.findMany({
    where: { publishGroupId: job.publishGroupId } as Prisma.PublishJobWhereInput,
    select: { status: true },
  });
  if (groupJobs.length === 0) return;

  const terminal = groupJobs.every(
    (j) => j.status === PublishJobStatus.SUCCESS || j.status === PublishJobStatus.FAILED,
  );
  if (!terminal) return;

  const allSuccess = groupJobs.every((j) => j.status === PublishJobStatus.SUCCESS);
  const anySuccess = groupJobs.some((j) => j.status === PublishJobStatus.SUCCESS);

  if (allSuccess) {
    await prisma.contentPost.update({
      where: { id: job.contentPostId },
      data: { status: ContentPostStatus.PUBLISHED },
    });
    appLogger.info("publish.group.all_success", {
      contentPostId: job.contentPostId,
      publishGroupId: job.publishGroupId,
      jobCount: String(groupJobs.length),
    });
    return;
  }

  if (anySuccess) {
    await prisma.contentPost.update({
      where: { id: job.contentPostId },
      data: { status: ContentPostStatus.PUBLISHED },
    });
    appLogger.warn("publish.group.partial_success", {
      contentPostId: job.contentPostId,
      publishGroupId: job.publishGroupId,
      jobCount: String(groupJobs.length),
    });
    return;
  }

  await prisma.contentPost.update({
    where: { id: job.contentPostId },
    data: { status: ContentPostStatus.FAILED },
  });
  appLogger.warn("publish.group.all_failed", {
    contentPostId: job.contentPostId,
    publishGroupId: job.publishGroupId,
    jobCount: String(groupJobs.length),
  });
}

async function reconcileLegacySingleJob(contentPostId: string, lastStatus: string): Promise<void> {
  if (lastStatus === PublishJobStatus.SUCCESS) {
    await prisma.contentPost.update({
      where: { id: contentPostId },
      data: { status: ContentPostStatus.PUBLISHED },
    });
  } else if (lastStatus === PublishJobStatus.FAILED) {
    await prisma.contentPost.update({
      where: { id: contentPostId },
      data: { status: ContentPostStatus.FAILED },
    });
  }
}
