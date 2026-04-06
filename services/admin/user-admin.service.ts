import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/types/domain";
import { hashPassword } from "@/services/auth/credentials-auth.service";

export type AdminUserListItem = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const userListSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  mustChangePassword: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export async function listUsersForAdmin(): Promise<AdminUserListItem[]> {
  return prisma.user.findMany({
    select: userListSelect,
    orderBy: [{ createdAt: "desc" }],
  });
}

export type CreateUserInput = {
  name: string;
  email: string;
  temporaryPassword: string;
  isActive?: boolean;
};

export async function createUserByAdmin(input: CreateUserInput): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Ad soyad gerekli" };
  if (!email) return { ok: false, error: "E-posta gerekli" };
  if (input.temporaryPassword.length < 8) {
    return { ok: false, error: "Geçici şifre en az 8 karakter olmalı" };
  }

  const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) {
    return { ok: false, error: "Bu e-posta ile zaten bir kullanıcı var" };
  }

  const passwordHash = await hashPassword(input.temporaryPassword);

  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: UserRole.USER,
        isActive: input.isActive ?? true,
        mustChangePassword: true,
      },
      select: { id: true },
    });
    await tx.appSetting.create({
      data: {
        userId: u.id,
        defaultTimezone: "Europe/Istanbul",
        notifyEmail: true,
        notifyInApp: true,
        notifyPublishResult: true,
      },
    });
    return u;
  });

  return { ok: true, id: user.id };
}

export type UpdateUserInput = {
  userId: string;
  name: string;
  email: string;
  isActive: boolean;
  role: typeof UserRole.ADMIN | typeof UserRole.USER;
  /** Boş bırakılırsa şifre değişmez */
  newTemporaryPassword?: string;
};

export async function updateUserByAdmin(
  actorUserId: string,
  input: UpdateUserInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Ad soyad gerekli" };
  if (!email) return { ok: false, error: "E-posta gerekli" };

  const target = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, email: true, role: true },
  });
  if (!target) return { ok: false, error: "Kullanıcı bulunamadı" };

  const emailOwner = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (emailOwner && emailOwner.id !== input.userId) {
    return { ok: false, error: "Bu e-posta başka bir kullanıcıya ait" };
  }

  const adminCount = await prisma.user.count({ where: { role: UserRole.ADMIN, isActive: true } });

  if (target.role === UserRole.ADMIN && !input.isActive && adminCount <= 1) {
    return { ok: false, error: "Son aktif yönetici pasif yapılamaz" };
  }

  if (target.id === actorUserId && !input.isActive) {
    return { ok: false, error: "Kendi hesabınızı pasif yapamazsınız" };
  }

  if (target.role === UserRole.ADMIN && input.role === UserRole.USER && adminCount <= 1) {
    return { ok: false, error: "Son yönetici rolü kullanıcıya çekilemez" };
  }

  const data: Prisma.UserUpdateInput = {
    name,
    email,
    isActive: input.isActive,
    role: input.role,
  };

  if (input.newTemporaryPassword && input.newTemporaryPassword.length > 0) {
    if (input.newTemporaryPassword.length < 8) {
      return { ok: false, error: "Yeni geçici şifre en az 8 karakter olmalı" };
    }
    data.passwordHash = await hashPassword(input.newTemporaryPassword);
    data.mustChangePassword = true;
  }

  await prisma.user.update({
    where: { id: input.userId },
    data,
  });

  return { ok: true };
}

export async function setUserActiveByAdmin(
  actorUserId: string,
  userId: string,
  isActive: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (userId === actorUserId && !isActive) {
    return { ok: false, error: "Kendi hesabınızı pasif yapamazsınız" };
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!target) return { ok: false, error: "Kullanıcı bulunamadı" };

  const adminCount = await prisma.user.count({ where: { role: UserRole.ADMIN, isActive: true } });

  if (target.role === UserRole.ADMIN && !isActive && adminCount <= 1) {
    return { ok: false, error: "Son aktif yönetici pasif yapılamaz" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isActive },
  });

  return { ok: true };
}
