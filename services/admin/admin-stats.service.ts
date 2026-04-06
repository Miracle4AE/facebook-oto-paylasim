import { addDays, eachDayOfInterval, format, startOfDay, subDays } from "date-fns";
import { tr } from "date-fns/locale";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PublishLogStatus } from "@/types/domain";

function nonArchivedWhere(): Prisma.UserWhereInput {
  return { archivedAt: null } as Prisma.UserWhereInput;
}

export type AdminDashboardStats = {
  totalUsers: number;
  activeUsers: number;
  passiveUsers: number;
  usersWithFacebook: number;
  todayPublishTotal: number;
  todayPublishSuccess: number;
  todayPublishFailed: number;
  problematicIntegrations: number;
  last7Days: { dayLabel: string; total: number; success: number; failed: number }[];
  recentUsers: {
    id: string;
    name: string | null;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: Date;
    lastLoginAt: Date | null;
  }[];
  recentErrorLogs: {
    id: string;
    createdAt: Date;
    message: string | null;
    userEmail: string | null;
    contentTitle: string | null;
  }[];
  expiringSubscriptions: {
    userId: string;
    name: string | null;
    email: string;
    planName: string;
    endAt: Date;
    daysLeft: number;
  }[];
};

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrow = addDays(todayStart, 1);
  const baseUser = nonArchivedWhere();

  const [
    totalUsers,
    activeUsers,
    passiveUsers,
    usersWithFacebook,
    todayPublishTotal,
    todayPublishSuccess,
    todayPublishFailed,
    problematicIntegrations,
    recentUsersRaw,
    recentErrorLogsRaw,
    expiringSubs,
  ] = await Promise.all([
    prisma.user.count({ where: baseUser }),
    prisma.user.count({ where: { ...baseUser, isActive: true } as Prisma.UserWhereInput }),
    prisma.user.count({ where: { ...baseUser, isActive: false } as Prisma.UserWhereInput }),
    prisma.user.count({
      where: {
        ...baseUser,
        facebookAccounts: { some: { isActive: true } },
      },
    }),
    prisma.publishLog.count({
      where: { createdAt: { gte: todayStart, lt: tomorrow } },
    }),
    prisma.publishLog.count({
      where: {
        createdAt: { gte: todayStart, lt: tomorrow },
        status: PublishLogStatus.SUCCESS,
      },
    }),
    prisma.publishLog.count({
      where: {
        createdAt: { gte: todayStart, lt: tomorrow },
        status: PublishLogStatus.FAILED,
      },
    }),
    prisma.facebookAccount.count({
      where: {
        OR: [
          { tokenExpiresAt: { not: null, lt: now } },
          { isActive: false, accessTokenEnc: { not: null } },
        ],
      } as unknown as Prisma.FacebookAccountWhereInput,
    }),
    prisma.user.findMany({
      where: baseUser,
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
      },
    } as Parameters<typeof prisma.user.findMany>[0]),
    prisma.publishLog.findMany({
      where: { status: PublishLogStatus.FAILED },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        createdAt: true,
        message: true,
        contentPost: { select: { title: true, user: { select: { email: true } } } },
      },
    }),
    (prisma as unknown as {
      userSubscription: {
        findMany: (a: unknown) => Promise<
          {
            endAt: Date;
            user: { id: string; name: string | null; email: string };
            plan: { name: string };
          }[]
        >;
      };
    }).userSubscription.findMany({
      where: {
        endAt: { gte: now, lte: addDays(now, 14) },
        user: baseUser,
      },
      orderBy: { endAt: "asc" },
      take: 10,
      include: {
        user: { select: { id: true, name: true, email: true } },
        plan: { select: { name: true } },
      },
    }),
  ]);

  const intervalStart = startOfDay(subDays(now, 6));
  const days = eachDayOfInterval({ start: intervalStart, end: startOfDay(now) });

  const last7Days = await Promise.all(
    days.map(async (d) => {
      const start = d;
      const end = addDays(start, 1);
      const [total, success, failed] = await Promise.all([
        prisma.publishLog.count({
          where: { createdAt: { gte: start, lt: end } },
        }),
        prisma.publishLog.count({
          where: {
            createdAt: { gte: start, lt: end },
            status: PublishLogStatus.SUCCESS,
          },
        }),
        prisma.publishLog.count({
          where: {
            createdAt: { gte: start, lt: end },
            status: PublishLogStatus.FAILED,
          },
        }),
      ]);
      return {
        dayLabel: format(d, "EEE d MMM", { locale: tr }),
        total,
        success,
        failed,
      };
    }),
  );

  const expiringSubscriptions = expiringSubs.map((s: (typeof expiringSubs)[number]) => {
    const daysLeft = Math.max(0, Math.ceil((s.endAt.getTime() - now.getTime()) / (86400 * 1000)));
    return {
      userId: s.user.id,
      name: s.user.name,
      email: s.user.email,
      planName: s.plan.name,
      endAt: s.endAt,
      daysLeft,
    };
  });

  return {
    totalUsers,
    activeUsers,
    passiveUsers,
    usersWithFacebook,
    todayPublishTotal,
    todayPublishSuccess,
    todayPublishFailed,
    problematicIntegrations,
    last7Days,
    recentUsers: recentUsersRaw as unknown as AdminDashboardStats["recentUsers"],
    recentErrorLogs: recentErrorLogsRaw.map((l: (typeof recentErrorLogsRaw)[number]) => ({
      id: l.id,
      createdAt: l.createdAt,
      message: l.message,
      userEmail: l.contentPost.user.email,
      contentTitle: l.contentPost.title,
    })),
    expiringSubscriptions,
  };
}
