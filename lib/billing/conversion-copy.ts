import { SubscriptionPlanCode } from "@/types/domain";

export type ConversionContext = {
  planCode: string;
  maxGroupTargets: number;
  groupCount: number;
  groupPercent: number;
  isUnlimitedGroups: boolean;
  dailyShareFlowLimit: number | null;
  bulkFlowsToday: number;
  todayDistinctGroups: number;
  didShareToday: boolean;
  isTrialLike: boolean;
};

function clampPct(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

/** Ana banner satırı — agresif değil, net */
export function buildPrimaryConversionLine(ctx: ConversionContext): string | null {
  if (ctx.isUnlimitedGroups) {
    return null;
  }

  const max = ctx.maxGroupTargets;
  const used = ctx.groupCount;

  if (used >= max) {
    return `Grup limitin doldu (${max}/${max}). Daha fazla kişiye ulaşmak için planını yükselt.`;
  }

  if (used >= Math.max(1, Math.ceil(max * 0.8))) {
    return `${max} grubun ${used}'ünü kullandın — dolmadan yükselt, kesinti yaşama.`;
  }

  if (ctx.isTrialLike) {
    return null;
  }

  if (ctx.planCode === SubscriptionPlanCode.FREE) {
    return "Ücretsiz planda sınırlı grup ve günlük paylaşım akışı var — büyümek için plan yükselt.";
  }

  return null;
}

/** Deneme geri sayım metni */
export function buildTrialCountdownLine(trialEndsAt: Date | null, isTrialLike: boolean): string | null {
  if (!isTrialLike || !trialEndsAt) return null;
  const ms = trialEndsAt.getTime() - Date.now();
  if (ms <= 0) return null;
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  const hours = Math.ceil(ms / (60 * 60 * 1000));
  if (days >= 2) {
    return `Denemen bitmesine ${days} gün kaldı — PRO ile devam etmek için planını netleştir.`;
  }
  if (hours >= 24) {
    return `Denemen bitmesine 1 gün kaldı — kesintisiz kullanım için yükseltmeyi düşün.`;
  }
  if (hours > 0) {
    return `Denemen bitmesine yaklaşık ${hours} saat kaldı.`;
  }
  return "Denemen çok yakında bitiyor — PRO erişimini kaybetmemek için harekete geç.";
}

/** Deneme bittikten sonra (FREE’ye düşen) */
export function buildTrialEndedLine(show: boolean): string | null {
  if (!show) return null;
  return "PRO özelliklerini kaybettin — sınırsız grup ve akışa dönmek için planını yükselt.";
}

/**
 * Yumuşak hatırlatma (dashboard alt satır)
 * Görünmez değil, spam da değil — tek satır
 */
export function buildSoftPressureLine(ctx: ConversionContext): string | null {
  if (ctx.planCode !== SubscriptionPlanCode.FREE && !ctx.isUnlimitedGroups) {
    if (ctx.groupPercent >= 70 && ctx.groupPercent < 100) {
      return "Limit seni yavaşlatıyor olabilir — daha fazla grup için bir üst plana göz at.";
    }
  }

  if (ctx.planCode === SubscriptionPlanCode.FREE && ctx.groupCount > 0 && !ctx.didShareToday) {
    return "Bugün daha fazla gruba ulaşabilirdin; küçük bir paylaşım bile görünürlüğü artırır.";
  }

  if (
    ctx.dailyShareFlowLimit != null &&
    ctx.bulkFlowsToday >= ctx.dailyShareFlowLimit &&
    ctx.planCode === SubscriptionPlanCode.FREE
  ) {
    return "Günlük paylaşım akışı kotan doldu — yarın devam edebilir veya sınırı kaldırabilirsin.";
  }

  return null;
}

export function computeGroupPercent(used: number, max: number, unlimited: boolean): number {
  if (unlimited || max <= 0) return 0;
  return clampPct((used / max) * 100);
}
