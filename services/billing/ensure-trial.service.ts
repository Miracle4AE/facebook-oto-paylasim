import { prisma } from "@/lib/prisma";
import { TRIAL_DAYS_PRO } from "@/lib/billing/limits";
import { SubscriptionPlanCode } from "@/types/domain";
import { UserRole } from "@/types/domain";

/**
 * İlk girişte hiç aboneliği olmayan normal kullanıcıya otomatik PRO deneme (3 gün).
 * Admin veya mevcut aboneliği olanlar atlanır.
 */
export async function ensureProTrialForNewUser(userId: string, role: string): Promise<void> {
  if (role === UserRole.ADMIN) return;

  const now = new Date();
  const hasActive = await prisma.userSubscription.findFirst({
    where: {
      userId,
      startAt: { lte: now },
      endAt: { gt: now },
    },
    select: { id: true },
  });
  if (hasActive) return;

  const ever = await prisma.userSubscription.count({ where: { userId } });
  if (ever > 0) return;

  const pro = await prisma.subscriptionPlan.findUnique({
    where: { code: SubscriptionPlanCode.PRO },
    select: { id: true },
  });
  if (!pro) return;

  const end = new Date(now);
  end.setDate(end.getDate() + TRIAL_DAYS_PRO);

  await prisma.userSubscription.create({
    data: {
      userId,
      planId: pro.id,
      startAt: now,
      endAt: end,
      paymentStatus: "WAIVED",
      paymentNote: `Otomatik ${TRIAL_DAYS_PRO} gün PRO deneme`,
      autoRenew: false,
    },
  });
}
