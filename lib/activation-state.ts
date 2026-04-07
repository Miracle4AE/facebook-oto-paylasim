import { prisma } from "@/lib/prisma";
import { PublishLogStatus } from "@/types/domain";
import { TargetChannelType } from "@/types/domain";

export type ActivationMilestones = {
  hasGroupTarget: boolean;
  hasContent: boolean;
  hasFirstShare: boolean;
};

/**
 * Ürün aktivasyonu: gerçek veriden türetilir (ayrı onboarding bayrağı yok).
 * - Grup: en az bir GROUP hedefi
 * - İçerik: en az bir gönderi
 * - İlk paylaşım: grup paylaşım logu veya başarılı yayın logu
 */
export async function getActivationMilestones(userId: string): Promise<ActivationMilestones> {
  const [groupCount, contentCount, groupShareLogCount, publishSuccessCount] = await Promise.all([
    prisma.targetChannel.count({
      where: { userId, channelType: TargetChannelType.GROUP, isActive: true },
    }),
    prisma.contentPost.count({ where: { userId } }),
    prisma.contentGroupShareLog.count({ where: { userId } }),
    prisma.publishLog.count({
      where: { contentPost: { userId }, status: PublishLogStatus.SUCCESS },
    }),
  ]);

  return {
    hasGroupTarget: groupCount > 0,
    hasContent: contentCount > 0,
    hasFirstShare: groupShareLogCount > 0 || publishSuccessCount > 0,
  };
}

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
