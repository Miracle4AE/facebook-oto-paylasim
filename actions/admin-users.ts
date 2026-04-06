"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  adminCreateUserSchema,
  adminUpdateUserSchema,
} from "@/lib/validations";
import { requireAdminUser } from "@/lib/session";
import {
  archiveUserByAdmin,
  createUserByAdmin,
  extendUserSubscriptionByAdmin,
  forcePasswordChangeByAdmin,
  rotateTemporaryPasswordByAdmin,
  setUserActiveByAdmin,
  updateUserByAdmin,
  updateUserSubscriptionByAdmin,
} from "@/services/admin/user-admin.service";

function revalidateAdminUserPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/kullanicilar");
}

export async function createUserAdminAction(input: unknown) {
  const admin = await requireAdminUser();
  if (!admin) return { ok: false as const, error: "Yetkisiz" };

  const parsed = adminCreateUserSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Geçersiz veri" };

  const d = parsed.data;
  const startRaw = d.subscriptionStartAt?.trim();
  const endRaw = d.subscriptionEndAt?.trim();
  const startAt = startRaw ? new Date(startRaw) : null;
  const endAt = endRaw ? new Date(endRaw) : null;
  if (startAt && Number.isNaN(startAt.getTime())) {
    return { ok: false as const, error: "Başlangıç tarihi geçersiz" };
  }
  if (endAt && Number.isNaN(endAt.getTime())) {
    return { ok: false as const, error: "Bitiş tarihi geçersiz" };
  }

  const result = await createUserByAdmin(admin.id, {
    name: d.name,
    email: d.email,
    temporaryPassword: d.temporaryPassword,
    isActive: d.isActive,
    role: d.role,
    mustChangePassword: d.mustChangePassword,
    adminNote: d.adminNote ?? null,
    planId: d.planId?.trim() ? d.planId : null,
    subscriptionStartAt: startAt,
    subscriptionEndAt: endAt,
    paymentNote: d.paymentNote ?? null,
    paymentStatus: d.paymentStatus,
  });

  if (!result.ok) return { ok: false as const, error: result.error };
  revalidateAdminUserPaths();
  return { ok: true as const, id: result.id };
}

export async function updateUserAdminAction(input: unknown) {
  const admin = await requireAdminUser();
  if (!admin) return { ok: false as const, error: "Yetkisiz" };

  const parsed = adminUpdateUserSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Geçersiz veri" };

  const pwd = parsed.data.newTemporaryPassword?.trim();
  const result = await updateUserByAdmin(admin.id, {
    userId: parsed.data.userId,
    name: parsed.data.name,
    email: parsed.data.email,
    isActive: parsed.data.isActive,
    role: parsed.data.role,
    newTemporaryPassword: pwd && pwd.length > 0 ? pwd : undefined,
    adminNote: parsed.data.adminNote,
  });

  if (!result.ok) return { ok: false as const, error: result.error };
  revalidateAdminUserPaths();
  revalidatePath(`/admin/kullanicilar/${parsed.data.userId}`);
  return { ok: true as const };
}

export async function setUserActiveAdminAction(userId: string, isActive: boolean) {
  const admin = await requireAdminUser();
  if (!admin) return { ok: false as const, error: "Yetkisiz" };

  const result = await setUserActiveByAdmin(admin.id, userId, isActive);
  if (!result.ok) return { ok: false as const, error: result.error };
  revalidateAdminUserPaths();
  revalidatePath(`/admin/kullanicilar/${userId}`);
  return { ok: true as const };
}

export async function archiveUserAdminAction(userId: string) {
  const admin = await requireAdminUser();
  if (!admin) return { ok: false as const, error: "Yetkisiz" };
  const result = await archiveUserByAdmin(admin.id, userId);
  if (!result.ok) return { ok: false as const, error: result.error };
  revalidateAdminUserPaths();
  revalidatePath(`/admin/kullanicilar/${userId}`);
  return { ok: true as const };
}

export async function rotateTempPasswordAdminAction(userId: string) {
  const admin = await requireAdminUser();
  if (!admin) return { ok: false as const, error: "Yetkisiz" };
  const result = await rotateTemporaryPasswordByAdmin(admin.id, userId);
  if (!result.ok) return { ok: false as const, error: result.error };
  revalidateAdminUserPaths();
  revalidatePath(`/admin/kullanicilar/${userId}`);
  return { ok: true as const, password: result.generatedPassword };
}

export async function forcePasswordChangeAdminAction(userId: string) {
  const admin = await requireAdminUser();
  if (!admin) return { ok: false as const, error: "Yetkisiz" };
  const result = await forcePasswordChangeByAdmin(admin.id, userId);
  if (!result.ok) return { ok: false as const, error: result.error };
  revalidateAdminUserPaths();
  revalidatePath(`/admin/kullanicilar/${userId}`);
  return { ok: true as const };
}

export async function updateSubscriptionAdminAction(input: unknown) {
  const admin = await requireAdminUser();
  if (!admin) return { ok: false as const, error: "Yetkisiz" };
  const schema = z.object({
    userId: z.string().min(1),
    planId: z.string().min(1),
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    paymentNote: z.string().optional().nullable(),
    paymentStatus: z.enum(["PENDING", "PAID", "FAILED", "MANUAL", "WAIVED"]).optional(),
    autoRenew: z.boolean().optional(),
  });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Geçersiz veri" };
  const result = await updateUserSubscriptionByAdmin(admin.id, {
    userId: parsed.data.userId,
    planId: parsed.data.planId,
    startAt: new Date(parsed.data.startAt),
    endAt: new Date(parsed.data.endAt),
    paymentNote: parsed.data.paymentNote,
    paymentStatus: parsed.data.paymentStatus,
    autoRenew: parsed.data.autoRenew,
  });
  if (!result.ok) return { ok: false as const, error: result.error };
  revalidateAdminUserPaths();
  revalidatePath(`/admin/kullanicilar/${parsed.data.userId}`);
  revalidatePath("/admin/abonelikler");
  return { ok: true as const };
}

export async function extendSubscriptionAdminAction(userId: string, days: number) {
  const admin = await requireAdminUser();
  if (!admin) return { ok: false as const, error: "Yetkisiz" };
  const result = await extendUserSubscriptionByAdmin(admin.id, userId, days);
  if (!result.ok) return { ok: false as const, error: result.error };
  revalidateAdminUserPaths();
  revalidatePath(`/admin/kullanicilar/${userId}`);
  revalidatePath("/admin/abonelikler");
  return { ok: true as const };
}
