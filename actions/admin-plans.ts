"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminUser } from "@/lib/session";
import { AdminAuditAction, AdminEntityType, writeAdminAuditLog } from "@/services/admin/audit.service";
import { updateSubscriptionPlanById } from "@/services/admin/subscription-plan.service";

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  maxTargetChannels: z.coerce.number().int().min(0).max(99999),
  dailyPublishLimit: z.coerce.number().int().min(0).max(99999),
  isActive: z.boolean(),
  description: z.string().nullable().optional(),
});

export async function updateSubscriptionPlanAdminAction(input: unknown) {
  const admin = await requireAdminUser();
  if (!admin) return { ok: false as const, error: "Yetkisiz" };

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Geçersiz veri" };

  const result = await updateSubscriptionPlanById(parsed.data.id, {
    name: parsed.data.name,
    maxTargetChannels: parsed.data.maxTargetChannels,
    dailyPublishLimit: parsed.data.dailyPublishLimit,
    isActive: parsed.data.isActive,
    description: parsed.data.description ?? null,
  });
  if (!result.ok) return { ok: false as const, error: result.error };

  await writeAdminAuditLog({
    actorUserId: admin.id,
    action: AdminAuditAction.PLAN_UPDATE,
    entityType: AdminEntityType.PLAN,
    entityId: parsed.data.id,
    metadata: { name: parsed.data.name },
  });

  revalidatePath("/admin/abonelikler");
  return { ok: true as const };
}
