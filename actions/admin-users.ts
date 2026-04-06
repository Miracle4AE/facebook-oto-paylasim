"use server";

import { revalidatePath } from "next/cache";
import {
  adminCreateUserSchema,
  adminUpdateUserSchema,
} from "@/lib/validations";
import { requireAdminUser } from "@/lib/session";
import {
  createUserByAdmin,
  setUserActiveByAdmin,
  updateUserByAdmin,
} from "@/services/admin/user-admin.service";

export async function createUserAdminAction(input: unknown) {
  const admin = await requireAdminUser();
  if (!admin) return { ok: false as const, error: "Yetkisiz" };

  const parsed = adminCreateUserSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Geçersiz veri" };

  const result = await createUserByAdmin({
    name: parsed.data.name,
    email: parsed.data.email,
    temporaryPassword: parsed.data.temporaryPassword,
    isActive: parsed.data.isActive,
  });

  if (!result.ok) return { ok: false as const, error: result.error };
  revalidatePath("/admin/kullanicilar");
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
  });

  if (!result.ok) return { ok: false as const, error: result.error };
  revalidatePath("/admin/kullanicilar");
  return { ok: true as const };
}

export async function setUserActiveAdminAction(userId: string, isActive: boolean) {
  const admin = await requireAdminUser();
  if (!admin) return { ok: false as const, error: "Yetkisiz" };

  const result = await setUserActiveByAdmin(admin.id, userId, isActive);
  if (!result.ok) return { ok: false as const, error: result.error };
  revalidatePath("/admin/kullanicilar");
  return { ok: true as const };
}
