import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ADMIN_ACCOUNT_EMAIL } from "@/lib/admin-default-account";
import { UserRole } from "@/types/domain";

const BCRYPT_ROUNDS = 12;

/**
 * Yalnızca yönetici hesabı (admin + şifre); seed ve /api/admin/bootstrap ortak kullanır.
 */
export async function upsertBootstrapAdmin(plainPassword: string) {
  const passwordHash = await bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
  return prisma.user.upsert({
    where: { email: ADMIN_ACCOUNT_EMAIL },
    update: {
      passwordHash,
      name: "Yönetici",
      role: UserRole.ADMIN,
      isActive: true,
      mustChangePassword: false,
    } as Prisma.UserUncheckedUpdateInput,
    create: {
      email: ADMIN_ACCOUNT_EMAIL,
      passwordHash,
      name: "Yönetici",
      timezone: "Europe/Istanbul",
      role: UserRole.ADMIN,
      isActive: true,
      mustChangePassword: false,
    } as Prisma.UserUncheckedCreateInput,
  });
}
