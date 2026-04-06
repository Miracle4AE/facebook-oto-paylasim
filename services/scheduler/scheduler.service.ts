import type { Prisma } from "@prisma/client";
import { randomBytes } from "crypto";
import { getISODay } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { executePublishJob } from "@/services/publish/publish-orchestrator.service";
import { appLogger } from "@/services/logging/app-logger";
import { ContentPostStatus, PublishJobStatus, ScheduleRecurrence } from "@/types/domain";

const STALE_PROCESSING_MS = 15 * 60 * 1000;
export const PUBLISH_SCHEDULER_BATCH_LIMIT = 25;

function parseJsonArray(raw: string): string[] {
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function parseTimes(raw: string): string[] {
  try {
    const v = JSON.parse(raw) as unknown;
    if (Array.isArray(v)) return v.filter((x) => typeof x === "string");
    return [];
  } catch {
    return [];
  }
}

function matchesNow(
  now: Date,
  recurrence: string,
  scheduledAt: Date | null,
  timesOfDay: string[] | string,
  daysOfWeek: string | null,
  tz: string,
): boolean {
  const times = typeof timesOfDay === "string" ? parseTimes(timesOfDay) : timesOfDay;
  const hm = formatInTimeZone(now, tz, "HH:mm");
  if (!times.includes(hm)) return false;

  if (recurrence === ScheduleRecurrence.ONCE) {
    if (!scheduledAt) return false;
    const d = formatInTimeZone(scheduledAt, tz, "yyyy-MM-dd");
    const today = formatInTimeZone(now, tz, "yyyy-MM-dd");
    return d === today;
  }

  if (recurrence === ScheduleRecurrence.WEEKLY && daysOfWeek) {
    const days = parseJsonArray(daysOfWeek).map(Number);
    const z = toZonedTime(now, tz);
    const isoDay = getISODay(z);
    if (!days.includes(isoDay)) return false;
  }

  return true;
}

export async function enqueueDueJobs(now: Date = new Date()): Promise<number> {
  const slots = await prisma.scheduleSlot.findMany({
    where: { isActive: true },
    include: { contentPost: true },
  });

  let created = 0;
  for (const slot of slots) {
    if (slot.contentPost.status !== ContentPostStatus.SCHEDULED) continue;
    if (!matchesNow(now, slot.recurrence, slot.scheduledAt, slot.timesOfDay, slot.daysOfWeek, slot.timezone)) {
      continue;
    }

    const targetIds = parseJsonArray(slot.targetChannelIds);
    const dayKey = formatInTimeZone(now, slot.timezone, "yyyy-MM-dd");
    const hm = formatInTimeZone(now, slot.timezone, "HH:mm");
    const publishGroupId = `slot_${slot.id}_${dayKey}_${hm}`;

    for (const targetId of targetIds) {
      const idempotencyKey = `${slot.id}_${targetId}_${dayKey}_${hm}`;

      const exists = await prisma.publishJob.findUnique({ where: { idempotencyKey } });
      if (exists) continue;

      await prisma.publishJob.create({
        data: {
          contentPostId: slot.contentPostId,
          targetChannelId: targetId,
          scheduleSlotId: slot.id,
          status: PublishJobStatus.PENDING,
          scheduledFor: now,
          idempotencyKey,
          publishGroupId,
        } as Prisma.PublishJobUncheckedCreateInput,
      });
      created += 1;
    }
  }
  return created;
}

/**
 * Uzun süre PROCESSING kalan işleri tekrar kuyruğa alır (worker çökmesi senaryosu).
 */
export async function releaseStaleProcessingJobs(now: Date = new Date()): Promise<number> {
  const threshold = new Date(now.getTime() - STALE_PROCESSING_MS);
  const res = await prisma.publishJob.updateMany({
    where: {
      status: PublishJobStatus.PROCESSING,
      updatedAt: { lt: threshold },
    },
    data: {
      status: PublishJobStatus.PENDING,
      scheduledFor: now,
    },
  });
  if (res.count > 0) {
    appLogger.warn("publish.scheduler.stale_processing_released", {
      count: String(res.count),
    });
  }
  return res.count;
}

/**
 * Atomik claim: tek seferde bir iş; aynı içerikte eşzamanlı PROCESSING engellenir.
 */
export async function claimNextPublishJob(now: Date = new Date()): Promise<string | null> {
  return prisma.$transaction(async (tx) => {
    const next = await tx.publishJob.findFirst({
      where: {
        AND: [
          {
            OR: [
              {
                status: PublishJobStatus.PENDING,
                scheduledFor: { lte: now },
              },
              {
                status: PublishJobStatus.RETRY_SCHEDULED,
                nextRetryAt: { lte: now },
              },
            ],
          },
          {
            contentPost: {
              publishJobs: {
                none: { status: PublishJobStatus.PROCESSING },
              },
            },
          },
        ],
      },
      orderBy: { scheduledFor: "asc" },
      select: { id: true, status: true },
    });

    if (!next) return null;

    const updated = await tx.publishJob.updateMany({
      where: {
        id: next.id,
        status: next.status,
      },
      data: {
        status: PublishJobStatus.PROCESSING,
        attempts: { increment: 1 },
      },
    });

    if (updated.count !== 1) {
      return null;
    }

    return next.id;
  });
}

export async function processPendingJobs(limit = PUBLISH_SCHEDULER_BATCH_LIMIT): Promise<{ processed: number }> {
  let processed = 0;
  for (let i = 0; i < limit; i++) {
    const jobId = await claimNextPublishJob();
    if (!jobId) break;
    await executePublishJob(jobId);
    processed += 1;
  }
  return { processed };
}

/** Eski sürümlerde RUNNING string'i kullanılıyordu; PENDING'e taşır. */
async function migrateLegacyRunningJobs(): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "PublishJob" SET status = 'PENDING' WHERE status = 'RUNNING'`,
    );
  } catch {
    /* ignore: tablo adı / sağlayıcı farkı */
  }
}

export async function runSchedulerTick(): Promise<{ enqueued: number; processed: number; staleReleased: number }> {
  await migrateLegacyRunningJobs();
  const staleReleased = await releaseStaleProcessingJobs();
  const enqueued = await enqueueDueJobs();
  const { processed } = await processPendingJobs();
  return { enqueued, processed, staleReleased };
}

export function createPublishGroupId(prefix: string): string {
  return `${prefix}_${randomBytes(10).toString("hex")}`;
}
