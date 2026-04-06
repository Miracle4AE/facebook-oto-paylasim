import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PublishLogStatus, UserRole } from "@/types/domain";

/** `findFirst` / liste select; bazı IDE ortamlarında güncel Prisma şeması yansımayınca `never` üretebilir. */
type AdminUserDetailUserRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
  passwordChangedAt: Date | null;
  archivedAt: Date | null;
  adminNote: string | null;
  timezone: string;
};

type UserListPlanPeek = { plan: { name: string; code: string } };

type AdminAuditRowForUser = {
  id: string;
  createdAt: Date;
  action: string;
  actor: { email: string };
};

type FbAccountAdminRow = {
  id: string;
  label: string;
  pageId: string | null;
  isActive: boolean;
  tokenExpiresAt: Date | null;
  updatedAt: Date;
  accessTokenEnc: string | null;
  accessToken: string | null;
};

const userListBaseWhere = (includeArchived: boolean): Prisma.UserWhereInput =>
  (includeArchived ? {} : { archivedAt: null }) as Prisma.UserWhereInput;

export type AdminUserTableRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
  archivedAt: Date | null;
  publishCount: number;
  planName: string | null;
  planCode: string | null;
  hasFacebook: boolean;
};

export type AdminUserListParams = {
  page: number;
  pageSize: number;
  q?: string;
  role?: "" | "ADMIN" | "USER";
  active?: "all" | "active" | "passive";
  facebook?: "all" | "yes" | "no";
  planCode?: string;
  includeArchived?: boolean;
  sortBy: "createdAt" | "lastLoginAt" | "publishCount";
  sortDir: "asc" | "desc";
};

export async function listUsersAdminTable(
  params: AdminUserListParams,
): Promise<{ rows: AdminUserTableRow[]; total: number }> {
  const skip = (params.page - 1) * params.pageSize;
  const take = params.pageSize;

  const where = {
    ...userListBaseWhere(Boolean(params.includeArchived)),
    ...(params.q
      ? {
          OR: [
            { email: { contains: params.q.trim(), mode: "insensitive" as const } },
            { name: { contains: params.q.trim(), mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(params.role === "ADMIN" || params.role === "USER" ? { role: params.role } : {}),
    ...(params.active === "active"
      ? { isActive: true }
      : params.active === "passive"
        ? { isActive: false }
        : {}),
    ...(params.facebook === "yes"
      ? { facebookAccounts: { some: { isActive: true } } }
      : params.facebook === "no"
        ? { facebookAccounts: { none: { isActive: true } } }
        : {}),
    ...(params.planCode
      ? {
          subscriptions: {
            some: {
              plan: { code: params.planCode },
              endAt: { gte: new Date() },
            },
          },
        }
      : {}),
  } as Prisma.UserWhereInput;

  const orderBy = (
    params.sortBy === "lastLoginAt"
      ? [{ lastLoginAt: params.sortDir }, { createdAt: "desc" }]
      : params.sortBy === "createdAt"
        ? [{ createdAt: params.sortDir }]
        : [{ createdAt: "desc" }]
  ) as Prisma.UserOrderByWithRelationInput[];

  const total = await prisma.user.count({ where });

  const userSelect = {
    id: true,
    email: true,
    name: true,
    role: true,
    isActive: true,
    mustChangePassword: true,
    createdAt: true,
    lastLoginAt: true,
    archivedAt: true,
    facebookAccounts: { where: { isActive: true }, select: { id: true }, take: 1 },
    subscriptions: {
      orderBy: { endAt: "desc" },
      take: 1,
      select: {
        plan: { select: { name: true, code: true } },
      },
    },
  } as const;

  if (params.sortBy === "publishCount") {
    /** Büyük tablolarda üst sınır; tam sıralama için ileride SQL agregasyonu önerilir */
    const cap = 800;
    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: cap,
      select: userSelect,
    });
    const ids = users.map((u) => u.id);
    const counts =
      ids.length === 0
        ? new Map<string, number>()
        : await fetchPublishCountsByUserIds(ids);

    let rows: AdminUserTableRow[] = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      isActive: u.isActive,
      mustChangePassword: u.mustChangePassword,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      archivedAt: u.archivedAt,
      publishCount: counts.get(u.id) ?? 0,
      planName: (u.subscriptions as UserListPlanPeek[])[0]?.plan.name ?? null,
      planCode: (u.subscriptions as UserListPlanPeek[])[0]?.plan.code ?? null,
      hasFacebook: u.facebookAccounts.length > 0,
    }));

    rows = rows.sort((a, b) =>
      params.sortDir === "asc"
        ? a.publishCount - b.publishCount
        : b.publishCount - a.publishCount,
    );
    rows = rows.slice(skip, skip + take);
    return { rows, total };
  }

  const users = await prisma.user.findMany({
    where,
    orderBy,
    skip,
    take,
    select: userSelect,
  });

  const ids = users.map((u) => u.id);
  const counts =
    ids.length === 0
      ? new Map<string, number>()
      : await fetchPublishCountsByUserIds(ids);

  const rows: AdminUserTableRow[] = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    isActive: u.isActive,
    mustChangePassword: u.mustChangePassword,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
    archivedAt: u.archivedAt,
    publishCount: counts.get(u.id) ?? 0,
    planName: (u.subscriptions as UserListPlanPeek[])[0]?.plan.name ?? null,
    planCode: (u.subscriptions as UserListPlanPeek[])[0]?.plan.code ?? null,
    hasFacebook: u.facebookAccounts.length > 0,
  }));

  return { rows, total };
}

async function fetchPublishCountsByUserIds(userIds: string[]): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map();
  const rows = await prisma.$queryRaw<{ uid: string; c: bigint }[]>`
    SELECT cp."userId" as uid, COUNT(pl.id)::bigint as c
    FROM "PublishLog" pl
    INNER JOIN "ContentPost" cp ON cp.id = pl."contentPostId"
    WHERE cp."userId" IN (${Prisma.join(userIds)})
    GROUP BY cp."userId"
  `;
  const m = new Map<string, number>();
  for (const r of rows) {
    m.set(r.uid, Number(r.c));
  }
  return m;
}

export type AdminUserDetail = {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    isActive: boolean;
    mustChangePassword: boolean;
    createdAt: Date;
    lastLoginAt: Date | null;
    passwordChangedAt: Date | null;
    archivedAt: Date | null;
    adminNote: string | null;
    timezone: string;
  };
  subscription: {
    id: string;
    planName: string;
    planCode: string;
    startAt: Date;
    endAt: Date;
    paymentNote: string | null;
    paymentStatus: string;
    autoRenew: boolean;
    daysLeft: number;
  } | null;
  stats: {
    targetCount: number;
    contentCount: number;
    publishTotal: number;
    publishSuccess: number;
    publishFailed: number;
    last30dPublish: number;
  };
  facebook: {
    id: string;
    label: string;
    pageId: string | null;
    isActive: boolean;
    tokenExpiresAt: Date | null;
    tokenHealth: "unknown" | "ok" | "expired" | "missing";
    lastChecked: Date | null;
  }[];
  recentLogs: {
    id: string;
    createdAt: Date;
    status: string;
    message: string | null;
    channelName: string;
    contentTitle: string | null;
  }[];
  recentPublishAttempts: {
    id: string;
    createdAt: Date;
    status: string;
    scheduledFor: Date;
    channelName: string;
  }[];
  auditForUser: {
    id: string;
    createdAt: Date;
    action: string;
    actorEmail: string;
  }[];
};

function maskSecret(s: string | null | undefined): string {
  if (!s || s.length < 4) return "—";
  return `••••${s.slice(-4)}`;
}

export async function getUserAdminDetail(userId: string): Promise<AdminUserDetail | null> {
  const u = (await prisma.user.findFirst({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      createdAt: true,
      lastLoginAt: true,
      passwordChangedAt: true,
      archivedAt: true,
      adminNote: true,
      timezone: true,
    },
  } as Parameters<typeof prisma.user.findFirst>[0])) as AdminUserDetailUserRow | null;
  if (!u) return null;

  const now = new Date();
  const sub = await (prisma as unknown as { userSubscription: { findFirst: (a: unknown) => Promise<unknown> } }).userSubscription.findFirst({
    where: { userId },
    orderBy: { endAt: "desc" },
    include: { plan: true },
  }) as {
    id: string;
    startAt: Date;
    endAt: Date;
    paymentNote: string | null;
    paymentStatus: string;
    autoRenew: boolean;
    plan: { name: string; code: string };
  } | null;

  const daysLeft = sub
    ? Math.max(0, Math.ceil((sub.endAt.getTime() - now.getTime()) / (86400 * 1000)))
    : 0;

  const [
    targetCount,
    contentCount,
    publishTotal,
    publishSuccess,
    publishFailed,
    last30dPublish,
    fbAccounts,
    recentLogs,
    recentJobs,
    auditForUser,
  ] = await Promise.all([
    prisma.targetChannel.count({ where: { userId } }),
    prisma.contentPost.count({ where: { userId } }),
    prisma.publishLog.count({ where: { contentPost: { userId } } }),
    prisma.publishLog.count({
      where: { contentPost: { userId }, status: PublishLogStatus.SUCCESS },
    }),
    prisma.publishLog.count({
      where: { contentPost: { userId }, status: PublishLogStatus.FAILED },
    }),
    prisma.publishLog.count({
      where: {
        contentPost: { userId },
        createdAt: { gte: new Date(now.getTime() - 30 * 86400 * 1000) },
      },
    }),
    prisma.facebookAccount.findMany({
      where: { userId },
      select: {
        id: true,
        label: true,
        pageId: true,
        isActive: true,
        tokenExpiresAt: true,
        updatedAt: true,
        accessTokenEnc: true,
        accessToken: true,
      },
    } as any) as unknown as Promise<FbAccountAdminRow[]>,
    prisma.publishLog.findMany({
      where: { contentPost: { userId } },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: {
        targetChannel: { select: { name: true } },
        contentPost: { select: { title: true } },
      },
    }),
    prisma.publishJob.findMany({
      where: { contentPost: { userId } },
      orderBy: { scheduledFor: "desc" },
      take: 12,
      include: {
        targetChannel: { select: { name: true } },
      },
    }),
    (prisma as unknown as { adminAuditLog: { findMany: (a: unknown) => Promise<AdminAuditRowForUser[]> } }).adminAuditLog.findMany({
      where: { entityType: "USER", entityId: userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { actor: { select: { email: true } } },
    }),
  ]);

  const facebook = fbAccounts.map((f: FbAccountAdminRow) => {
    const hasToken = Boolean(f.accessTokenEnc || f.accessToken);
    let tokenHealth: "unknown" | "ok" | "expired" | "missing" = "unknown";
    if (!hasToken) tokenHealth = "missing";
    else if (f.tokenExpiresAt && f.tokenExpiresAt < now) tokenHealth = "expired";
    else tokenHealth = "ok";
    return {
      id: f.id,
      label: f.label,
      pageId: f.pageId ? maskSecret(f.pageId) : null,
      isActive: f.isActive,
      tokenExpiresAt: f.tokenExpiresAt,
      tokenHealth,
      lastChecked: f.updatedAt,
    };
  });

  return {
    user: {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      isActive: u.isActive,
      mustChangePassword: u.mustChangePassword,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      passwordChangedAt: u.passwordChangedAt,
      archivedAt: u.archivedAt,
      adminNote: u.adminNote,
      timezone: u.timezone,
    },
    subscription: sub
      ? {
          id: sub.id,
          planName: sub.plan.name,
          planCode: sub.plan.code,
          startAt: sub.startAt,
          endAt: sub.endAt,
          paymentNote: sub.paymentNote,
          paymentStatus: sub.paymentStatus,
          autoRenew: sub.autoRenew,
          daysLeft,
        }
      : null,
    stats: {
      targetCount,
      contentCount,
      publishTotal,
      publishSuccess,
      publishFailed,
      last30dPublish,
    },
    facebook,
    recentLogs: recentLogs.map((l: (typeof recentLogs)[number]) => ({
      id: l.id,
      createdAt: l.createdAt,
      status: l.status,
      message: l.message,
      channelName: l.targetChannel.name,
      contentTitle: l.contentPost.title,
    })),
    recentPublishAttempts: recentJobs.map((j: (typeof recentJobs)[number]) => ({
      id: j.id,
      createdAt: j.createdAt,
      status: j.status,
      scheduledFor: j.scheduledFor,
      channelName: j.targetChannel.name,
    })),
    auditForUser: auditForUser.map((a: (typeof auditForUser)[number]) => ({
      id: a.id,
      createdAt: a.createdAt,
      action: a.action,
      actorEmail: a.actor.email,
    })),
  };
}

export async function getUserAdminQuick(id: string) {
  return prisma.user.findFirst({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      createdAt: true,
      lastLoginAt: true,
      archivedAt: true,
    },
  } as Parameters<typeof prisma.user.findFirst>[0]) as Promise<
    Pick<
      AdminUserDetailUserRow,
      | "id"
      | "email"
      | "name"
      | "role"
      | "isActive"
      | "mustChangePassword"
      | "createdAt"
      | "lastLoginAt"
      | "archivedAt"
    > | null
  >;
}

/** Son aktif yöneticiyi koruma kontrolü için */
export async function countActiveAdmins(): Promise<number> {
  return prisma.user.count({
    where: { role: UserRole.ADMIN, isActive: true, archivedAt: null } as Prisma.UserWhereInput,
  });
}
