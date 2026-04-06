import type { AdminUserListParams } from "@/services/admin/user-admin-list.service";

function first(sp: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const v = sp[key];
  return Array.isArray(v) ? v[0] : v;
}

export function parseAdminUserListParams(
  sp: Record<string, string | string[] | undefined>,
): AdminUserListParams {
  const page = Math.max(1, parseInt(first(sp, "page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(5, parseInt(first(sp, "pageSize") ?? "20", 10) || 20));
  const q = first(sp, "q")?.trim() || undefined;
  const roleRaw = first(sp, "role");
  const role: "" | "ADMIN" | "USER" =
    roleRaw === "ADMIN" || roleRaw === "USER" ? roleRaw : "";
  const activeRaw = first(sp, "active");
  const active =
    activeRaw === "active" || activeRaw === "passive" || activeRaw === "all" ? activeRaw : "all";
  const fbRaw = first(sp, "facebook");
  const facebook =
    fbRaw === "yes" || fbRaw === "no" || fbRaw === "all" ? fbRaw : "all";
  const planCode = first(sp, "plan")?.trim() || undefined;
  const includeArchived = first(sp, "archived") === "1";
  const sortRaw = first(sp, "sort");
  const sortBy =
    sortRaw === "lastLoginAt" || sortRaw === "publishCount" || sortRaw === "createdAt"
      ? sortRaw
      : "createdAt";
  const dirRaw = first(sp, "dir");
  const sortDir = dirRaw === "asc" || dirRaw === "desc" ? dirRaw : "desc";

  return {
    page,
    pageSize,
    q,
    role,
    active,
    facebook,
    planCode,
    includeArchived,
    sortBy,
    sortDir,
  };
}
