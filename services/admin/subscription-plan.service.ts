import { prisma } from "@/lib/prisma";
import { SubscriptionPlanCode } from "@/types/domain";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

type SubscriptionPlanAdminPatch = {
  name?: string;
  maxTargetChannels?: number;
  dailyPublishLimit?: number;
  isActive?: boolean;
  description?: string | null;
};

export type SubscriptionPlanRow = {
  id: string;
  code: string;
  name: string;
  maxTargetChannels: number;
  dailyPublishLimit: number;
  isActive: boolean;
  description: string | null;
  sortOrder: number;
};

export async function listSubscriptionPlans(): Promise<SubscriptionPlanRow[]> {
  return db.subscriptionPlan.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      maxTargetChannels: true,
      dailyPublishLimit: true,
      isActive: true,
      description: true,
      sortOrder: true,
    },
  });
}

export async function updateSubscriptionPlanById(
  id: string,
  data: {
    name?: string;
    maxTargetChannels?: number;
    dailyPublishLimit?: number;
    isActive?: boolean;
    description?: string | null;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const exists = await db.subscriptionPlan.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return { ok: false, error: "Plan bulunamadı" };

  const patch: SubscriptionPlanAdminPatch = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.maxTargetChannels !== undefined) patch.maxTargetChannels = data.maxTargetChannels;
  if (data.dailyPublishLimit !== undefined) patch.dailyPublishLimit = data.dailyPublishLimit;
  if (data.isActive !== undefined) patch.isActive = data.isActive;
  if (data.description !== undefined) patch.description = data.description;

  await db.subscriptionPlan.update({ where: { id }, data: patch });
  return { ok: true };
}

export async function getPlanByCode(code: SubscriptionPlanCode) {
  return db.subscriptionPlan.findUnique({ where: { code } });
}

export async function listUserSubscriptionsForAdmin() {
  return db.userSubscription.findMany({
    orderBy: { endAt: "asc" },
    take: 500,
    include: {
      user: { select: { id: true, email: true, name: true, archivedAt: true } },
      plan: true,
    },
  });
}
