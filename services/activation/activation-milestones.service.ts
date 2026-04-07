import "server-only";

import type { ActivationMilestones } from "@/lib/activation-state";
import { prisma } from "@/lib/prisma";
import { PublishLogStatus } from "@/types/domain";
import { TargetChannelType } from "@/types/domain";

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
