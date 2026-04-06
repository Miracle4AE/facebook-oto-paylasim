import bcrypt from "bcryptjs";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type CredentialsAuthFailure = "not_found" | "wrong_password" | "inactive";

export type CredentialsAuthResult =
  | { ok: true; user: Pick<User, "id" | "email" | "name" | "image" | "role" | "mustChangePassword"> }
  | { ok: false; reason: CredentialsAuthFailure };

const BCRYPT_ROUNDS = 12;

/**
 * E-posta + şifre ile kimlik doğrulama (giriş ve JWT authorize için tek kaynak).
 */
export async function authenticateUser(email: string, password: string): Promise<CredentialsAuthResult> {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalized },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      passwordHash: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
    },
  });

  if (!user) {
    return { ok: false, reason: "not_found" };
  }

  if (!user.isActive) {
    return { ok: false, reason: "inactive" };
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return { ok: false, reason: "wrong_password" };
  }

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    },
  };
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}
