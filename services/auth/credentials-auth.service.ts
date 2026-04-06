import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export type CredentialsAuthFailure = "not_found" | "wrong_password" | "inactive";

/** Prisma `User` ile uyumlu; `Pick<User, …>` bazı ortamlarda `unknown` üretebildiği için açık tip. */
export type SessionAuthUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
  mustChangePassword: boolean;
};

export type CredentialsAuthResult =
  | { ok: true; user: SessionAuthUser }
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
      archivedAt: true,
    },
  });

  if (!user) {
    return { ok: false, reason: "not_found" };
  }

  if (user.archivedAt !== null || !user.isActive) {
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
