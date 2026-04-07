import { formatInTimeZone } from "date-fns-tz";
import type { SubscriptionPlan } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildPrimaryConversionLine,
  buildSoftPressureLine,
  buildTrialCountdownLine,
  buildTrialEndedLine,
  computeGroupPercent,
  type ConversionContext,
} from "@/lib/billing/conversion-copy";
import { VIRTUAL_FREE_LIMITS } from "@/lib/billing/limits";
import { ContentGroupShareLogKind } from "@/types/group-share";
import { SubscriptionPlanCode, TargetChannelType } from "@/types/domain";

export type BillingDashboardDTO = {
  planCode: string;
  planName: string;
  maxGroupTargets: number;
  dailyShareFlowLimit: number | null;
  groupCount: number;
  showUpgradeHint: boolean;
  subscriptionEndAt: string | null;
  isTrialLike: boolean;
  /** 0–100, sınırlı planda grup kullanımı */
  groupPercent: number;
  bulkFlowsToday: number;
  showTrialExpiredBanner: boolean;
  trialCountdownLine: string | null;
  trialEndedLine: string | null;
  primaryUpgradeLine: string | null;
  softPressureLine: string | null;
  showUsageProgress: boolean;
};

export type HabitSnapshotForBilling = {
  todayDistinctGroups: number;
  didShareToday: boolean;
};

const PAYMENT_OK = ["PAID", "WAIVED", "MANUAL"] as const;

export type EffectiveEntitlements = {
  planCode: SubscriptionPlanCode,
  planName: string;
  maxGroupTargets: number;
  /** null = sınırsız */
  dailyShareFlowLimit: number | null;
  dailyPublishLimit: number | null;
  isTrialLike: boolean;
  subscriptionEndAt: Date | null;
};

function isUnlimited(n: number): boolean {
  return n >= 999_999;
}

function resolveMaxGroupTargets(plan: SubscriptionPlan): number {
  if (plan.maxGroupTargets != null) return plan.maxGroupTargets;
  const code = plan.code;
  if (code === SubscriptionPlanCode.PRO || code === SubscriptionPlanCode.PREMIUM || code === SubscriptionPlanCode.CUSTOM) {
    return 999_999_999;
  }
  return plan.maxTargetChannels;
}

function resolveDailyShareFlowLimit(plan: SubscriptionPlan): number | null {
  if (plan.dailyShareFlowLimit != null) return plan.dailyShareFlowLimit;
  return null;
}

function virtualFreeEntitlements(): EffectiveEntitlements {
  return {
    planCode: SubscriptionPlanCode.FREE,
    planName: "Ücretsiz",
    maxGroupTargets: VIRTUAL_FREE_LIMITS.maxGroupTargets,
    dailyShareFlowLimit: VIRTUAL_FREE_LIMITS.dailyShareFlowLimit,
    dailyPublishLimit: VIRTUAL_FREE_LIMITS.dailyPublishLimit,
    isTrialLike: false,
    subscriptionEndAt: null,
  };
}

/**
 * Aktif abonelik: şu an geçerli, ödeme durumu uygun, bitmemiş.
 */
export async function getEffectiveEntitlements(userId: string): Promise<EffectiveEntitlements> {
  const now = new Date();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  const tz = user?.timezone?.trim() || "Europe/Istanbul";

  const sub = await prisma.userSubscription.findFirst({
    where: {
      userId,
      startAt: { lte: now },
      endAt: { gt: now },
      paymentStatus: { in: [...PAYMENT_OK] },
    },
    orderBy: { endAt: "desc" },
    include: { plan: true },
  });

  if (!sub) {
    return virtualFreeEntitlements();
  }

  const plan = sub.plan;
  const maxG = resolveMaxGroupTargets(plan);
  const flow = resolveDailyShareFlowLimit(plan);

  const note = sub.paymentNote ?? "";
  const isProTrial =
    plan.code === SubscriptionPlanCode.PRO &&
    sub.paymentStatus === "WAIVED" &&
    (/deneme/i.test(note) || note.includes("Otomatik"));

  return {
    planCode: plan.code as SubscriptionPlanCode,
    planName: plan.name,
    maxGroupTargets: maxG,
    dailyShareFlowLimit: flow,
    dailyPublishLimit: plan.dailyPublishLimit,
    isTrialLike: isProTrial,
    subscriptionEndAt: sub.endAt,
  };
}

async function detectRecentProTrialExpiry(userId: string): Promise<boolean> {
  const now = new Date();
  const active = await prisma.userSubscription.findFirst({
    where: {
      userId,
      startAt: { lte: now },
      endAt: { gt: now },
      paymentStatus: { in: [...PAYMENT_OK] },
    },
    select: { id: true },
  });
  if (active) return false;

  const last = await prisma.userSubscription.findFirst({
    where: { userId, endAt: { lt: now } },
    orderBy: { endAt: "desc" },
    include: { plan: true },
  });
  if (!last) return false;
  const note = last.paymentNote ?? "";
  const wasTrial =
    last.plan.code === SubscriptionPlanCode.PRO &&
    last.paymentStatus === "WAIVED" &&
    (/deneme/i.test(note) || note.includes("Otomatik"));
  if (!wasTrial) return false;
  const hoursSince = (now.getTime() - last.endAt.getTime()) / (3600 * 1000);
  return hoursSince >= 0 && hoursSince < 24 * 7;
}

export async function getBillingDashboardDTO(
  userId: string,
  habit?: HabitSnapshotForBilling,
): Promise<BillingDashboardDTO> {
  const [ent, groupCount, bulkFlowsToday] = await Promise.all([
    getEffectiveEntitlements(userId),
    countActiveGroupTargets(userId),
    countBulkShareFlowsToday(userId),
  ]);

  const unlimitedGroups = isUnlimited(ent.maxGroupTargets);
  const groupPercent = computeGroupPercent(groupCount, ent.maxGroupTargets, unlimitedGroups);

  const msLeft =
    ent.subscriptionEndAt && ent.isTrialLike ? ent.subscriptionEndAt.getTime() - Date.now() : null;
  const trialEndingSoon = msLeft != null && msLeft > 0 && msLeft < 48 * 60 * 60 * 1000;

  const nearGroupCap =
    !unlimitedGroups && groupCount >= Math.max(1, Math.floor(ent.maxGroupTargets * 0.8));

  const showTrialExpiredBanner = await detectRecentProTrialExpiry(userId);

  const ctx: ConversionContext = {
    planCode: ent.planCode,
    maxGroupTargets: ent.maxGroupTargets,
    groupCount,
    groupPercent,
    isUnlimitedGroups: unlimitedGroups,
    dailyShareFlowLimit: ent.dailyShareFlowLimit,
    bulkFlowsToday,
    todayDistinctGroups: habit?.todayDistinctGroups ?? 0,
    didShareToday: habit?.didShareToday ?? false,
    isTrialLike: ent.isTrialLike,
  };

  const trialCountdownLine = buildTrialCountdownLine(ent.subscriptionEndAt, ent.isTrialLike);
  const trialEndedLine = buildTrialEndedLine(showTrialExpiredBanner);
  const primaryUpgradeLine = buildPrimaryConversionLine(ctx);
  const softPressureLine = buildSoftPressureLine(ctx);

  const showUpgradeHint =
    ent.planCode === SubscriptionPlanCode.FREE ||
    nearGroupCap ||
    trialEndingSoon ||
    showTrialExpiredBanner ||
    (primaryUpgradeLine != null && !unlimitedGroups);

  return {
    planCode: ent.planCode,
    planName: ent.planName,
    maxGroupTargets: ent.maxGroupTargets,
    dailyShareFlowLimit: ent.dailyShareFlowLimit,
    groupCount,
    showUpgradeHint,
    subscriptionEndAt: ent.subscriptionEndAt ? ent.subscriptionEndAt.toISOString() : null,
    isTrialLike: ent.isTrialLike,
    groupPercent,
    bulkFlowsToday,
    showTrialExpiredBanner,
    trialCountdownLine,
    trialEndedLine,
    primaryUpgradeLine,
    softPressureLine,
    showUsageProgress: !unlimitedGroups && ent.maxGroupTargets > 0,
  };
}

export async function countActiveGroupTargets(userId: string): Promise<number> {
  return prisma.targetChannel.count({
    where: { userId, channelType: TargetChannelType.GROUP, isActive: true },
  });
}

export async function assertCanAddGroupTarget(userId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const ent = await getEffectiveEntitlements(userId);
  const n = await countActiveGroupTargets(userId);
  if (n >= ent.maxGroupTargets && !isUnlimited(ent.maxGroupTargets)) {
    return {
      ok: false,
      message: `Grup hedefi limitine ulaştın (${ent.maxGroupTargets}). Daha fazla kişiye ulaşmak için planını yükselt.`,
    };
  }
  return { ok: true };
}

export async function countBulkShareFlowsToday(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  const tz = user?.timezone?.trim() || "Europe/Istanbul";
  const now = new Date();
  const dayKey = formatInTimeZone(now, tz, "yyyy-MM-dd");
  const since = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const rows = await prisma.contentGroupShareLog.findMany({
    where: {
      userId,
      eventKind: ContentGroupShareLogKind.BULK_FLOW_STARTED,
      createdAt: { gte: since },
    },
    select: { createdAt: true },
  });
  let c = 0;
  for (const r of rows) {
    if (formatInTimeZone(r.createdAt, tz, "yyyy-MM-dd") === dayKey) c += 1;
  }
  return c;
}

export async function assertCanStartShareFlow(
  userId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const ent = await getEffectiveEntitlements(userId);
  if (ent.dailyShareFlowLimit == null) return { ok: true };
  const used = await countBulkShareFlowsToday(userId);
  if (used >= ent.dailyShareFlowLimit) {
    return {
      ok: false,
      message: `Günlük paylaşım akışı limitine ulaştın (${ent.dailyShareFlowLimit}). Daha fazla kişiye ulaşmak için planını yükselt; yoksa yarın tekrar deneyebilirsin.`,
    };
  }
  return { ok: true };
}
