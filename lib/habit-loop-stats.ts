import "server-only";

import { endOfWeek, startOfWeek, subDays } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import type { HabitLoopSnapshot } from "@/types/habit-loop";
import { PublishLogStatus } from "@/types/domain";
import { ContentGroupShareLogKind } from "@/types/group-share";

const MEANINGFUL_GROUP_EVENTS: string[] = [
  ContentGroupShareLogKind.MARKED_DONE,
  ContentGroupShareLogKind.BULK_FLOW_STARTED,
];

function hourDistance(a: number, b: number): number {
  const d = Math.abs(a - b);
  return Math.min(d, 24 - d);
}

function modeHour(hours: number[]): number | null {
  if (hours.length < 3) return null;
  const counts = new Map<number, number>();
  for (const h of hours) {
    counts.set(h, (counts.get(h) ?? 0) + 1);
  }
  let best = -1;
  let bestH = 0;
  for (const [h, c] of Array.from(counts.entries())) {
    if (c > best) {
      best = c;
      bestH = h;
    }
  }
  return best >= 2 ? bestH : null;
}

function buildDaySet(
  groupLogs: { createdAt: Date }[],
  publishLogs: { createdAt: Date }[],
  tz: string,
): Set<string> {
  const set = new Set<string>();
  for (const row of groupLogs) {
    set.add(formatInTimeZone(row.createdAt, tz, "yyyy-MM-dd"));
  }
  for (const row of publishLogs) {
    set.add(formatInTimeZone(row.createdAt, tz, "yyyy-MM-dd"));
  }
  return set;
}

function computeStreak(daySet: Set<string>, tz: string, now: Date): number {
  const todayKey = formatInTimeZone(now, tz, "yyyy-MM-dd");
  const yesterdayKey = formatInTimeZone(subDays(now, 1), tz, "yyyy-MM-dd");

  const first = daySet.has(todayKey) ? 0 : daySet.has(yesterdayKey) ? 1 : -1;
  if (first === -1) return 0;

  let streak = 0;
  for (let k = first; k < 400; k++) {
    const key = formatInTimeZone(subDays(now, k), tz, "yyyy-MM-dd");
    if (daySet.has(key)) streak += 1;
    else break;
  }
  return streak;
}

/**
 * Kullanıcının alışkanlık döngüsü: günlük paylaşım, seri, haftalık özet, tipik saat.
 */
export async function getHabitLoopSnapshot(userId: string): Promise<HabitLoopSnapshot> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  const tz = user?.timezone?.trim() || "Europe/Istanbul";
  const now = new Date();

  const sinceYear = subDays(now, 400);

  const [groupLogs, publishLogs, publishSuccessCount, groupMeaningfulCount, todayGroupRows, todayPublishRows] =
    await Promise.all([
      prisma.contentGroupShareLog.findMany({
        where: {
          userId,
          eventKind: { in: MEANINGFUL_GROUP_EVENTS },
          createdAt: { gte: sinceYear },
        },
        select: { createdAt: true, targetChannelId: true },
      }),
      prisma.publishLog.findMany({
        where: {
          status: PublishLogStatus.SUCCESS,
          contentPost: { userId },
          createdAt: { gte: sinceYear },
        },
        select: { createdAt: true, targetChannelId: true },
      }),
      prisma.publishLog.count({
        where: { status: PublishLogStatus.SUCCESS, contentPost: { userId } },
      }),
      prisma.contentGroupShareLog.count({
        where: { userId, eventKind: { in: MEANINGFUL_GROUP_EVENTS } },
      }),
      prisma.contentGroupShareLog.findMany({
        where: {
          userId,
          eventKind: { in: MEANINGFUL_GROUP_EVENTS },
          createdAt: { gte: subDays(now, 2) },
        },
        select: { createdAt: true, targetChannelId: true },
      }),
      prisma.publishLog.findMany({
        where: {
          status: PublishLogStatus.SUCCESS,
          contentPost: { userId },
          createdAt: { gte: subDays(now, 2) },
        },
        select: { createdAt: true, targetChannelId: true },
      }),
    ]);

  const daySet = buildDaySet(groupLogs, publishLogs, tz);
  const todayKey = formatInTimeZone(now, tz, "yyyy-MM-dd");
  const didShareToday = daySet.has(todayKey);
  const streakDays = computeStreak(daySet, tz, now);

  const groupSetToday = new Set<string>();
  for (const row of todayGroupRows) {
    if (formatInTimeZone(row.createdAt, tz, "yyyy-MM-dd") === todayKey) {
      groupSetToday.add(row.targetChannelId);
    }
  }
  const publishSetToday = new Set<string>();
  for (const row of todayPublishRows) {
    if (formatInTimeZone(row.createdAt, tz, "yyyy-MM-dd") === todayKey) {
      publishSetToday.add(row.targetChannelId);
    }
  }
  const todayDistinctGroups = new Set([
    ...Array.from(groupSetToday.values()),
    ...Array.from(publishSetToday.values()),
  ]).size;

  const zNow = toZonedTime(now, tz);
  const weekStart = startOfWeek(zNow, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(zNow, { weekStartsOn: 1 });
  const weekStartKey = formatInTimeZone(weekStart, tz, "yyyy-MM-dd");
  const weekEndKey = formatInTimeZone(weekEnd, tz, "yyyy-MM-dd");

  const weekGroupIds = new Set<string>();
  let weekShareActions = 0;
  for (const row of groupLogs) {
    const k = formatInTimeZone(row.createdAt, tz, "yyyy-MM-dd");
    if (k >= weekStartKey && k <= weekEndKey) {
      weekShareActions += 1;
      weekGroupIds.add(row.targetChannelId);
    }
  }
  for (const row of publishLogs) {
    const k = formatInTimeZone(row.createdAt, tz, "yyyy-MM-dd");
    if (k >= weekStartKey && k <= weekEndKey) {
      weekShareActions += 1;
      weekGroupIds.add(row.targetChannelId);
    }
  }
  const weekDistinctGroups = weekGroupIds.size;

  const totalShareActions = publishSuccessCount + groupMeaningfulCount;

  const recentForHour = subDays(now, 60);
  const [groupRecent, publishRecent] = await Promise.all([
    prisma.contentGroupShareLog.findMany({
      where: {
        userId,
        eventKind: { in: MEANINGFUL_GROUP_EVENTS },
        createdAt: { gte: recentForHour },
      },
      select: { createdAt: true },
    }),
    prisma.publishLog.findMany({
      where: {
        status: PublishLogStatus.SUCCESS,
        contentPost: { userId },
        createdAt: { gte: recentForHour },
      },
      select: { createdAt: true },
    }),
  ]);
  const hourSamples: number[] = [];
  for (const row of groupRecent) {
    hourSamples.push(Number.parseInt(formatInTimeZone(row.createdAt, tz, "H"), 10));
  }
  for (const row of publishRecent) {
    hourSamples.push(Number.parseInt(formatInTimeZone(row.createdAt, tz, "H"), 10));
  }
  const usualShareHourLocal = modeHour(hourSamples);

  const currentHour = Number.parseInt(formatInTimeZone(now, tz, "H"), 10);
  const showTimeWindowHint =
    !didShareToday &&
    usualShareHourLocal !== null &&
    hourDistance(currentHour, usualShareHourLocal) <= 1;

  let motivationLine: string;
  if (todayDistinctGroups >= 2) {
    motivationLine = `Bugün ${todayDistinctGroups} gruba ulaştın. Daha fazla kişiye ulaşıyorsun.`;
  } else if (todayDistinctGroups === 1) {
    motivationLine = "Bugün paylaşımın kayıtlı — akışa devam edebilirsin.";
  } else if (didShareToday) {
    motivationLine = "Bugün paylaşım yaptın — düzenli kal.";
  } else {
    motivationLine = "Daha fazla kişiye ulaşıyorsun — küçük bir paylaşım bile fark yaratır.";
  }

  return {
    timezone: tz,
    didShareToday,
    streakDays,
    todayDistinctGroups,
    weekDistinctGroups,
    totalShareActions,
    weekShareActions,
    usualShareHourLocal,
    showTimeWindowHint,
    motivationLine,
  };
}
