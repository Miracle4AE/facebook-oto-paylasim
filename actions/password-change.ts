"use server";

import { changePasswordSchema } from "@/lib/validations";
import { getSessionUser } from "@/lib/session";
import { changeOwnPassword } from "@/services/auth/password-change.service";

export async function changePasswordAction(input: unknown) {
  const user = await getSessionUser();
  if (!user?.id) return { ok: false as const, error: "Oturum bulunamadı" };

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    const first = Object.values(msg).flat()[0];
    return { ok: false as const, error: first ?? "Geçersiz veri" };
  }

  const result = await changeOwnPassword(
    user.id,
    parsed.data.currentPassword,
    parsed.data.newPassword,
  );
  if (!result.ok) return { ok: false as const, error: result.error };
  return { ok: true as const };
}
