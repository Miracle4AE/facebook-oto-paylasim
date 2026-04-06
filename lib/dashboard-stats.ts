import { startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { ContentPostStatus, PublishJobStatus, PublishLogStatus } from "@/types/domain";

export async function getDashboardStats(userId: string) {
  const start = startOfDay(new Date());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const [
    activeTargets,
    scheduledContents,
    pendingToday,
    recentLogs,
    successLogs,
    failedLogs,
  ] = await Promise.all([
    prisma.targetChannel.count({ where: { userId, isActive: true } }),
    prisma.contentPost.count({ where: { userId, status: ContentPostStatus.SCHEDULED } }),
    prisma.publishJob.count({
      where: {
        contentPost: { userId },
        scheduledFor: { gte: start, lt: end },
        status: {
          in: [PublishJobStatus.PENDING, PublishJobStatus.PROCESSING, PublishJobStatus.RETRY_SCHEDULED],
        },
      },
    }),
    prisma.publishLog.findMany({
      where: { contentPost: { userId } },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { contentPost: true, targetChannel: true },
    }),
    prisma.publishLog.count({ where: { contentPost: { userId }, status: PublishLogStatus.SUCCESS } }),
    prisma.publishLog.count({ where: { contentPost: { userId }, status: PublishLogStatus.FAILED } }),
  ]);

  return {
    activeTargets,
    scheduledContents,
    pendingToday,
    recentLogs,
    successLogs,
    failedLogs,
  };
}
