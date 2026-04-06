"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminUser } from "@/lib/session";
import { AdminAuditAction, AdminEntityType, writeAdminAuditLog } from "@/services/admin/audit.service";
import {
  createPaymentRecord,
  updatePaymentRecord,
} from "@/services/admin/payment-admin.service";
const createSchema = z.object({
  userId: z.string().min(1),
  planId: z.string().optional().nullable(),
  amount: z.coerce.number().positive(),
  currency: z.string().min(1).max(8).optional(),
  paidAt: z.string().min(1),
  method: z.enum(["MANUAL", "STRIPE", "IYZICO", "OTHER"]),
  status: z.enum(["PENDING", "COMPLETED", "FAILED", "REFUNDED"]),
  note: z.string().optional().nullable(),
});

const updateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["PENDING", "COMPLETED", "FAILED", "REFUNDED"]).optional(),
  note: z.string().optional().nullable(),
});

export async function createPaymentAdminAction(input: unknown) {
  const admin = await requireAdminUser();
  if (!admin) return { ok: false as const, error: "Yetkisiz" };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Geçersiz veri" };

  const paidAt = new Date(parsed.data.paidAt);
  if (Number.isNaN(paidAt.getTime())) return { ok: false as const, error: "Tarih geçersiz" };

  const row = await createPaymentRecord({
    userId: parsed.data.userId,
    planId: parsed.data.planId ?? null,
    amount: parsed.data.amount,
    currency: parsed.data.currency,
    paidAt,
    method: parsed.data.method,
    status: parsed.data.status,
    note: parsed.data.note ?? null,
  });

  await writeAdminAuditLog({
    actorUserId: admin.id,
    action: AdminAuditAction.PAYMENT_CREATE,
    entityType: AdminEntityType.PAYMENT,
    entityId: row.id,
    metadata: { amount: parsed.data.amount, status: parsed.data.status },
  });

  revalidatePath("/admin/odemeler");
  return { ok: true as const, id: row.id };
}

export async function updatePaymentAdminAction(input: unknown) {
  const admin = await requireAdminUser();
  if (!admin) return { ok: false as const, error: "Yetkisiz" };

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Geçersiz veri" };

  const result = await updatePaymentRecord(parsed.data.id, {
    status: parsed.data.status,
    note: parsed.data.note,
  });
  if (!result.ok) return { ok: false as const, error: result.error };

  await writeAdminAuditLog({
    actorUserId: admin.id,
    action: AdminAuditAction.PAYMENT_UPDATE,
    entityType: AdminEntityType.PAYMENT,
    entityId: parsed.data.id,
    metadata: { status: parsed.data.status },
  });

  revalidatePath("/admin/odemeler");
  return { ok: true as const };
}
