/**
 * Aktivasyon adımları — saf yardımcılar ve tipler (Prisma yok; istemci bundle güvenli).
 * Veri çekme: `getActivationMilestones` → `@/services/activation/activation-milestones.service`
 */

export type ActivationMilestones = {
  hasGroupTarget: boolean;
  hasContent: boolean;
  hasFirstShare: boolean;
};

export function isActivationComplete(a: ActivationMilestones): boolean {
  return a.hasGroupTarget && a.hasContent && a.hasFirstShare;
}

export function activationProgressPercent(a: ActivationMilestones): number {
  let n = 0;
  if (a.hasGroupTarget) n += 1;
  if (a.hasContent) n += 1;
  if (a.hasFirstShare) n += 1;
  return Math.round((n / 3) * 100);
}
