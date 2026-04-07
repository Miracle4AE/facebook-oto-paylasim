import { prisma } from "@/lib/prisma";
import { ContentGroupShareLogKind, type GroupTargetShareStat } from "@/types/group-share";

export async function getGroupShareDraftsMapForContent(params: {
  userId: string;
  contentPostId: string;
}): Promise<Record<string, string>> {
  const rows = await prisma.contentGroupShareDraft.findMany({
    where: { userId: params.userId, contentPostId: params.contentPostId },
    select: { targetChannelId: true, customText: true },
  });
  const out: Record<string, string> = {};
  for (const r of rows) {
    out[r.targetChannelId] = r.customText ?? "";
  }
  return out;
}

export async function getGroupShareStatsForTargets(params: {
  userId: string;
  targetChannelIds: readonly string[];
}): Promise<GroupTargetShareStat[]> {
  const ids = [...params.targetChannelIds];
  if (ids.length === 0) return [];

  const [counts, maxOpened, maxMarked] = await Promise.all([
    prisma.contentGroupShareLog.groupBy({
      by: ["targetChannelId", "eventKind"],
      where: { userId: params.userId, targetChannelId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.contentGroupShareLog.groupBy({
      by: ["targetChannelId"],
      where: {
        userId: params.userId,
        targetChannelId: { in: ids },
        eventKind: ContentGroupShareLogKind.OPENED,
      },
      _max: { createdAt: true },
    }),
    prisma.contentGroupShareLog.groupBy({
      by: ["targetChannelId"],
      where: {
        userId: params.userId,
        targetChannelId: { in: ids },
        eventKind: ContentGroupShareLogKind.MARKED_DONE,
      },
      _max: { createdAt: true },
    }),
  ]);

  const openCount = new Map<string, number>();
  const markedCount = new Map<string, number>();
  for (const row of counts) {
    const n = row._count._all;
    if (row.eventKind === ContentGroupShareLogKind.OPENED) {
      openCount.set(row.targetChannelId, n);
    } else if (row.eventKind === ContentGroupShareLogKind.MARKED_DONE) {
      markedCount.set(row.targetChannelId, n);
    }
  }

  const lastOpen = new Map<string, Date | null>(
    maxOpened.map((r) => [r.targetChannelId, r._max.createdAt]),
  );
  const lastMarked = new Map<string, Date | null>(
    maxMarked.map((r) => [r.targetChannelId, r._max.createdAt]),
  );

  return ids.map((targetChannelId) => ({
    targetChannelId,
    openCount: openCount.get(targetChannelId) ?? 0,
    markedDoneCount: markedCount.get(targetChannelId) ?? 0,
    lastOpenedAt: lastOpen.get(targetChannelId) ?? null,
    lastMarkedAt: lastMarked.get(targetChannelId) ?? null,
  }));
}
