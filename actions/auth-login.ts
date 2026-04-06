"use server";

import { loginSchema } from "@/lib/validations";
import { authenticateUser } from "@/services/auth/credentials-auth.service";

export type LoginPrecheckResult =
  | { ok: true }
  | { ok: false; reason: "inactive" | "invalid" };

/**
 * Giriş öncesi doğrulama: Türkçe hata mesajları ve authorize ile çift bcrypt için.
 */
export async function preLoginCheck(input: unknown): Promise<LoginPrecheckResult> {
  try {
    const parsed = loginSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, reason: "invalid" };
    }
    const result = await authenticateUser(parsed.data.email, parsed.data.password);
    if (!result.ok) {
      if (result.reason === "inactive") {
        return { ok: false, reason: "inactive" };
      }
      return { ok: false, reason: "invalid" };
    }
    return { ok: true };
  } catch (e) {
    console.error("[preLoginCheck]", e);
    return { ok: false, reason: "invalid" };
  }
}
