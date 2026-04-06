import { prisma } from "@/lib/prisma";
import { PublishLogStatus } from "@/types/domain";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export type UnifiedLogLevel = "success" | "error" | "info" | "warn";

export type UnifiedLogItem = {
  id: string;
  source: "publish" | "admin_audit";
  createdAt: Date;
  level: UnifiedLogLevel;
  title: string;
  summary: string;
  userEmail: string | null;
  actorEmail: string | null;
  technicalDetail: string | null;
  metaJson: string | null;
  fbTraceId: string | null;
  targetChannelName: string | null;
  contentTitle: string | null;
};

function parseFbTrace(payloadJson: string | null): string | null {
  if (!payloadJson) return null;
  try {
    const o = JSON.parse(payloadJson) as Record<string, unknown>;
    const v = o.fbtrace_id ?? o.fbTraceId ?? o.trace_id;
    return typeof v === "string" ? v : null;
  } catch {
    return null;
  }
}

export type UnifiedLogQuery = {
  take: number;
  skip: number;
  from?: Date;
  to?: Date;
  source?: "all" | "publish" | "admin_audit";
  level?: "all" | "success" | "error" | "info" | "warn";
  userEmail?: string;
  search?: string;
  targetSearch?: string;
};

export async function queryUnifiedLogs(q: UnifiedLogQuery): Promise<{
  items: UnifiedLogItem[];
  totalApprox: number;
}> {
  const from = q.from;
  const to = q.to;
  const dateWhere =
    from || to
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {};

  const publishWhere = {
    ...dateWhere,
    ...(q.userEmail
      ? {
          contentPost: {
            user: { email: { contains: q.userEmail.trim(), mode: "insensitive" as const } },
          },
        }
      : {}),
    ...(q.search
      ? {
          OR: [
            { message: { contains: q.search.trim(), mode: "insensitive" as const } },
            { errorDetail: { contains: q.search.trim(), mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(q.targetSearch
      ? {
          targetChannel: {
            name: { contains: q.targetSearch.trim(), mode: "insensitive" as const },
          },
        }
      : {}),
  };

  const auditWhere = {
    ...dateWhere,
    ...(q.userEmail
      ? {
          actor: { email: { contains: q.userEmail.trim(), mode: "insensitive" as const } },
        }
      : {}),
    ...(q.search
      ? {
          OR: [
            { action: { contains: q.search.trim(), mode: "insensitive" as const } },
            { entityType: { contains: q.search.trim(), mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [publishRows, auditRows] = await Promise.all([
    q.source === "admin_audit"
      ? Promise.resolve([])
      : prisma.publishLog.findMany({
          where: publishWhere,
          orderBy: { createdAt: "desc" },
          take: 400,
          include: {
            contentPost: { select: { title: true, user: { select: { email: true } } } },
            targetChannel: { select: { name: true } },
          },
        }),
    q.source === "publish"
      ? Promise.resolve([])
      : db.adminAuditLog.findMany({
          where: auditWhere,
          orderBy: { createdAt: "desc" },
          take: 400,
          include: {
            actor: { select: { email: true } },
          },
        }),
  ]);

  const publishItems: UnifiedLogItem[] = publishRows.map((l: (typeof publishRows)[number]) => {
    const ok = l.status === PublishLogStatus.SUCCESS;
    const level: UnifiedLogLevel = ok ? "success" : l.status === PublishLogStatus.FAILED ? "error" : "warn";
    return {
      id: `pl_${l.id}`,
      source: "publish" as const,
      createdAt: l.createdAt,
      level,
      title: `Yayın: ${l.status}`,
      summary: l.message ?? l.errorDetail ?? "—",
      userEmail: l.contentPost.user.email,
      actorEmail: null,
      technicalDetail: l.errorDetail,
      metaJson: l.payloadJson,
      fbTraceId: parseFbTrace(l.payloadJson),
      targetChannelName: l.targetChannel.name,
      contentTitle: l.contentPost.title,
    };
  });

  const auditItems: UnifiedLogItem[] = auditRows.map((a: (typeof auditRows)[number]) => ({
    id: `au_${a.id}`,
    source: "admin_audit" as const,
    createdAt: a.createdAt,
    level: "info" as const,
    title: `${a.entityType}: ${a.action}`,
    summary: a.action,
    userEmail: null,
    actorEmail: a.actor.email,
    technicalDetail: a.metadata ? JSON.stringify(a.metadata, null, 2) : null,
    metaJson: a.metadata ? JSON.stringify(a.metadata) : null,
    fbTraceId: null,
    targetChannelName: null,
    contentTitle: a.entityId ?? null,
  }));

  let merged = [...publishItems, ...auditItems].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (q.level && q.level !== "all") {
    merged = merged.filter((x) => x.level === q.level);
  }

  const totalApprox = merged.length;
  const slice = merged.slice(q.skip, q.skip + q.take);

  return { items: slice, totalApprox };
}
