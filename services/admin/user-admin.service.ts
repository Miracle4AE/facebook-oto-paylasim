import { randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/types/domain";
import { hashPassword } from "@/services/auth/credentials-auth.service";
import { AdminAuditAction, AdminEntityType, writeAdminAuditLog } from "@/services/admin/audit.service";

export type AdminUserListItem = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
  adminNote: string | null;
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
  adminNote: true,
} as Prisma.UserSelect;

export async function listUsersForAdmin(): Promise<AdminUserListItem[]> {
  return prisma.user.findMany({
    where: { archivedAt: null } as Prisma.UserWhereInput,
    select: userListSelect,
    orderBy: [{ createdAt: "desc" }],
  }) as unknown as Promise<AdminUserListItem[]>;
}

export type CreateUserInput = {
  name: string;
  email: string;
  temporaryPassword: string;
  isActive?: boolean;
  role?: typeof UserRole.ADMIN | typeof UserRole.USER;
  mustChangePassword?: boolean;
  adminNote?: string | null;
  planId?: string | null;
  subscriptionStartAt?: Date | null;
  subscriptionEndAt?: Date | null;
  paymentNote?: string | null;
  paymentStatus?: string;
};

export async function createUserByAdmin(
  actorUserId: string,
  input: CreateUserInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
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

  if (input.planId && (!input.subscriptionStartAt || !input.subscriptionEndAt)) {
    return { ok: false, error: "Abonelik için başlangıç ve bitiş tarihi gerekli" };
  }

  const passwordHash = await hashPassword(input.temporaryPassword);
  const role = input.role ?? UserRole.USER;

  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        email,
        name,
        passwordHash,
        role,
        isActive: input.isActive ?? true,
        mustChangePassword: input.mustChangePassword ?? true,
        adminNote: input.adminNote?.trim() ? input.adminNote.trim() : null,
      } as Prisma.UserCreateInput,
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

    if (input.planId && input.subscriptionStartAt && input.subscriptionEndAt) {
      await (tx as unknown as { userSubscription: { create: (a: unknown) => Promise<unknown> } }).userSubscription.create({
        data: {
          userId: u.id,
          planId: input.planId,
          startAt: input.subscriptionStartAt,
          endAt: input.subscriptionEndAt,
          paymentNote: input.paymentNote?.trim() ?? null,
          paymentStatus: input.paymentStatus ?? "PENDING",
        },
      });
    }

    return u;
  });

  await writeAdminAuditLog({
    actorUserId,
    action: AdminAuditAction.USER_CREATE,
    entityType: AdminEntityType.USER,
    entityId: user.id,
    metadata: { email, role },
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
  adminNote?: string | null;
};

export async function updateUserByAdmin(
  actorUserId: string,
  input: UpdateUserInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Ad soyad gerekli" };
  if (!email) return { ok: false, error: "E-posta gerekli" };

  const target = (await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, email: true, role: true },
  } as Parameters<typeof prisma.user.findUnique>[0])) as {
    id: string;
    email: string;
    role: string;
  } | null;
  if (!target) return { ok: false, error: "Kullanıcı bulunamadı" };

  const emailOwner = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (emailOwner && emailOwner.id !== input.userId) {
    return { ok: false, error: "Bu e-posta başka bir kullanıcıya ait" };
  }

  const adminCount = await prisma.user.count({
    where: { role: UserRole.ADMIN, isActive: true, archivedAt: null } as Prisma.UserWhereInput,
  });

  if (target.role === UserRole.ADMIN && !input.isActive && adminCount <= 1) {
    return { ok: false, error: "Son aktif yönetici pasif yapılamaz" };
  }

  if (target.id === actorUserId && !input.isActive) {
    return { ok: false, error: "Kendi hesabınızı pasif yapamazsınız" };
  }

  if (target.role === UserRole.ADMIN && input.role === UserRole.USER && adminCount <= 1) {
    return { ok: false, error: "Son yönetici rolü kullanıcıya çekilemez" };
  }

  const data = {
    name,
    email,
    isActive: input.isActive,
    role: input.role,
  } as Prisma.UserUpdateInput;

  if (input.adminNote !== undefined) {
    (data as { adminNote?: string | null }).adminNote = input.adminNote?.trim() ? input.adminNote.trim() : null;
  }

  if (input.newTemporaryPassword && input.newTemporaryPassword.length > 0) {
    if (input.newTemporaryPassword.length < 8) {
      return { ok: false, error: "Yeni geçici şifre en az 8 karakter olmalı" };
    }
    (data as { passwordHash?: string; mustChangePassword?: boolean }).passwordHash = await hashPassword(
      input.newTemporaryPassword,
    );
    (data as { passwordHash?: string; mustChangePassword?: boolean }).mustChangePassword = true;
  }

  await prisma.user.update({
    where: { id: input.userId },
    data,
  });

  await writeAdminAuditLog({
    actorUserId,
    action: AdminAuditAction.USER_UPDATE,
    entityType: AdminEntityType.USER,
    entityId: input.userId,
    metadata: {
      emailChanged: target.email !== email,
      role: input.role,
      tempPasswordRotated: Boolean(input.newTemporaryPassword),
    },
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

  const target = (await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  } as Parameters<typeof prisma.user.findUnique>[0])) as { role: string } | null;
  if (!target) return { ok: false, error: "Kullanıcı bulunamadı" };

  const adminCount = await prisma.user.count({
    where: { role: UserRole.ADMIN, isActive: true, archivedAt: null } as Prisma.UserWhereInput,
  });

  if (target.role === UserRole.ADMIN && !isActive && adminCount <= 1) {
    return { ok: false, error: "Son aktif yönetici pasif yapılamaz" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isActive } as Prisma.UserUpdateInput,
  });

  await writeAdminAuditLog({
    actorUserId,
    action: isActive ? AdminAuditAction.USER_ACTIVATE : AdminAuditAction.USER_DEACTIVATE,
    entityType: AdminEntityType.USER,
    entityId: userId,
    metadata: { isActive },
  });

  return { ok: true };
}

export async function archiveUserByAdmin(
  actorUserId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (userId === actorUserId) {
    return { ok: false, error: "Kendi hesabınızı arşivleyemezsiniz" };
  }

  const target = (await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  } as Parameters<typeof prisma.user.findUnique>[0])) as { role: string } | null;
  if (!target) return { ok: false, error: "Kullanıcı bulunamadı" };

  const adminCount = await prisma.user.count({
    where: { role: UserRole.ADMIN, isActive: true, archivedAt: null } as Prisma.UserWhereInput,
  });

  if (target.role === UserRole.ADMIN && adminCount <= 1) {
    return { ok: false, error: "Son aktif yönetici arşivlenemez" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      archivedAt: new Date(),
      isActive: false,
    } as Prisma.UserUpdateInput,
  });

  await writeAdminAuditLog({
    actorUserId,
    action: AdminAuditAction.USER_ARCHIVE,
    entityType: AdminEntityType.USER,
    entityId: userId,
    metadata: {},
  });

  return { ok: true };
}

export async function rotateTemporaryPasswordByAdmin(
  actorUserId: string,
  userId: string,
): Promise<{ ok: true; generatedPassword: string } | { ok: false; error: string }> {
  if (userId === actorUserId) {
    return { ok: false, error: "Kendi hesabınız için bu işlemi kullanmayın" };
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!target) return { ok: false, error: "Kullanıcı bulunamadı" };

  const generatedPassword = randomBytes(9).toString("base64url").slice(0, 12);
  const passwordHash = await hashPassword(generatedPassword);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      mustChangePassword: true,
    } as Prisma.UserUpdateInput,
  });

  await writeAdminAuditLog({
    actorUserId,
    action: AdminAuditAction.USER_TEMP_PASSWORD,
    entityType: AdminEntityType.USER,
    entityId: userId,
    metadata: { rotated: true },
  });

  return { ok: true, generatedPassword };
}

export async function forcePasswordChangeByAdmin(
  actorUserId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!target) return { ok: false, error: "Kullanıcı bulunamadı" };

  await prisma.user.update({
    where: { id: userId },
    data: { mustChangePassword: true } as Prisma.UserUpdateInput,
  });

  await writeAdminAuditLog({
    actorUserId,
    action: AdminAuditAction.USER_FORCE_PASSWORD_CHANGE,
    entityType: AdminEntityType.USER,
    entityId: userId,
    metadata: {},
  });

  return { ok: true };
}

export async function updateUserSubscriptionByAdmin(
  actorUserId: string,
  input: {
    userId: string;
    planId: string;
    startAt: Date;
    endAt: Date;
    paymentNote?: string | null;
    paymentStatus?: string;
    autoRenew?: boolean;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (input.endAt <= input.startAt) {
    return { ok: false, error: "Bitiş tarihi başlangıçtan sonra olmalıdır" };
  }

  const subscriptionPlanDelegate = (prisma as unknown as {
    subscriptionPlan: { findUnique: (a: unknown) => Promise<unknown> };
  }).subscriptionPlan;

  const plan = (await subscriptionPlanDelegate.findUnique({
    where: { id: input.planId },
    select: { id: true },
  })) as { id: string } | null;
  if (!plan) return { ok: false, error: "Plan bulunamadı" };

  const prismaSubs = (prisma as unknown as {
    userSubscription: {
      findFirst: (a: unknown) => Promise<{ id: string } | null>;
      update: (a: unknown) => Promise<unknown>;
      create: (a: unknown) => Promise<unknown>;
    };
  }).userSubscription;

  const existing = await prismaSubs.findFirst({
    where: { userId: input.userId },
    orderBy: { endAt: "desc" },
    select: { id: true },
  });

  if (existing) {
    await prismaSubs.update({
      where: { id: existing.id },
      data: {
        planId: input.planId,
        startAt: input.startAt,
        endAt: input.endAt,
        paymentNote: input.paymentNote ?? null,
        paymentStatus: input.paymentStatus ?? "PENDING",
        autoRenew: input.autoRenew ?? false,
      },
    });
  } else {
    await prismaSubs.create({
      data: {
        userId: input.userId,
        planId: input.planId,
        startAt: input.startAt,
        endAt: input.endAt,
        paymentNote: input.paymentNote ?? null,
        paymentStatus: input.paymentStatus ?? "PENDING",
        autoRenew: input.autoRenew ?? false,
      },
    });
  }

  await writeAdminAuditLog({
    actorUserId,
    action: AdminAuditAction.SUBSCRIPTION_UPDATE,
    entityType: AdminEntityType.SUBSCRIPTION,
    entityId: input.userId,
    metadata: { planId: input.planId },
  });

  return { ok: true };
}

export async function extendUserSubscriptionByAdmin(
  actorUserId: string,
  userId: string,
  extraDays: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (extraDays < 1 || extraDays > 3650) {
    return { ok: false, error: "Gün sayısı 1–3650 arasında olmalıdır" };
  }

  const prismaSubs = (prisma as unknown as {
    userSubscription: {
      findFirst: (a: unknown) => Promise<{ id: string; endAt: Date } | null>;
      update: (a: unknown) => Promise<unknown>;
    };
  }).userSubscription;

  const sub = await prismaSubs.findFirst({
    where: { userId },
    orderBy: { endAt: "desc" },
  });
  if (!sub) return { ok: false, error: "Abonelik kaydı yok" };

  const base = sub.endAt > new Date() ? sub.endAt : new Date();
  const nextEnd = new Date(base);
  nextEnd.setDate(nextEnd.getDate() + extraDays);

  await prismaSubs.update({
    where: { id: sub.id },
    data: { endAt: nextEnd },
  });

  await writeAdminAuditLog({
    actorUserId,
    action: AdminAuditAction.SUBSCRIPTION_EXTEND,
    entityType: AdminEntityType.SUBSCRIPTION,
    entityId: userId,
    metadata: { extraDays, newEnd: nextEnd.toISOString() },
  });

  return { ok: true };
}
