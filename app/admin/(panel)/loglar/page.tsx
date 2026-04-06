import { AdminLogsView } from "@/components/admin/admin-logs-view";
import { parseAdminLogParams } from "@/lib/admin-log-params";
import { queryUnifiedLogs } from "@/services/admin/admin-logs.service";

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const params = parseAdminLogParams(sp);
  const { items } = await queryUnifiedLogs(params);

  const safeItems = JSON.parse(JSON.stringify(items)) as typeof items;
  const safeParams = JSON.parse(JSON.stringify(params)) as typeof params;

  return <AdminLogsView items={safeItems} params={safeParams} />;
}
