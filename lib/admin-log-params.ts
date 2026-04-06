import type { UnifiedLogQuery } from "@/services/admin/admin-logs.service";

function first(sp: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const v = sp[key];
  return Array.isArray(v) ? v[0] : v;
}

export function parseAdminLogParams(
  sp: Record<string, string | string[] | undefined>,
): UnifiedLogQuery {
  const take = Math.min(100, Math.max(5, parseInt(first(sp, "take") ?? "40", 10) || 40));
  const skip = Math.max(0, parseInt(first(sp, "skip") ?? "0", 10) || 0);
  const fromRaw = first(sp, "from");
  const toRaw = first(sp, "to");
  const from = fromRaw ? new Date(fromRaw) : undefined;
  const to = toRaw ? new Date(toRaw) : undefined;
  const sourceRaw = first(sp, "source");
  const source =
    sourceRaw === "publish" || sourceRaw === "admin_audit" || sourceRaw === "all"
      ? sourceRaw
      : "all";
  const levelRaw = first(sp, "level");
  const level =
    levelRaw === "success" || levelRaw === "error" || levelRaw === "info" || levelRaw === "warn" || levelRaw === "all"
      ? levelRaw
      : "all";
  const userEmail = first(sp, "user")?.trim() || undefined;
  const search = first(sp, "q")?.trim() || undefined;
  const targetSearch = first(sp, "hedef")?.trim() || undefined;

  return {
    take,
    skip,
    from: from && !Number.isNaN(from.getTime()) ? from : undefined,
    to: to && !Number.isNaN(to.getTime()) ? to : undefined,
    source,
    level,
    userEmail,
    search,
    targetSearch,
  };
}
