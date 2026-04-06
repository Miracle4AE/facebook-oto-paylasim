"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminUser } from "@/lib/session";
import { AdminAuditAction, AdminEntityType, writeAdminAuditLog } from "@/services/admin/audit.service";
import { updateSystemSettings } from "@/services/admin/system-settings.service";

const settingsSchema = z.object({
  defaultAppName: z.string().min(1).max(200),
  supportEmail: z.union([z.string().email(), z.literal("")]).optional(),
  defaultTimezone: z.string().min(1).max(80),
  publishRetryMax: z.coerce.number().int().min(0).max(20),
  logRetentionDays: z.coerce.number().int().min(1).max(3650),
  maintenanceMode: z.boolean(),
  facebookModeNote: z.string().max(500).optional(),
});

export async function updateSystemSettingsAction(input: unknown) {
  const admin = await requireAdminUser();
  if (!admin) return { ok: false as const, error: "Yetkisiz" };

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Geçersiz veri" };

  await updateSystemSettings({
    defaultAppName: parsed.data.defaultAppName,
    supportEmail: parsed.data.supportEmail === "" ? null : parsed.data.supportEmail,
    defaultTimezone: parsed.data.defaultTimezone,
    publishRetryMax: parsed.data.publishRetryMax,
    logRetentionDays: parsed.data.logRetentionDays,
    maintenanceMode: parsed.data.maintenanceMode,
    facebookModeNote: parsed.data.facebookModeNote,
  });

  await writeAdminAuditLog({
    actorUserId: admin.id,
    action: AdminAuditAction.SETTINGS_UPDATE,
    entityType: AdminEntityType.SETTINGS,
    entityId: "singleton",
    metadata: { keys: Object.keys(parsed.data) },
  });

  revalidatePath("/admin/ayarlar");
  return { ok: true as const };
}
