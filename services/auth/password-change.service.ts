import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/services/auth/credentials-auth.service";

export async function changeOwnPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (newPassword.length < 8) {
    return { ok: false, error: "Yeni şifre en az 8 karakter olmalı" };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) return { ok: false, error: "Kullanıcı bulunamadı" };

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) {
    return { ok: false, error: "Mevcut şifre hatalı" };
  }

  const nextHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: nextHash,
      mustChangePassword: false,
    },
  });

  return { ok: true };
}
