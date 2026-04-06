import { AdminUsersPageClient } from "@/components/admin/admin-users-page-client";
import { parseAdminUserListParams } from "@/lib/admin-list-params";
import { getSessionUser } from "@/lib/session";
import { listSubscriptionPlans } from "@/services/admin/subscription-plan.service";
import { listUsersAdminTable } from "@/services/admin/user-admin-list.service";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const params = parseAdminUserListParams(sp);
  const [data, plans, me] = await Promise.all([
    listUsersAdminTable(params),
    listSubscriptionPlans(),
    getSessionUser(),
  ]);

  const initialRows = JSON.parse(JSON.stringify(data.rows)) as typeof data.rows;

  return (
    <AdminUsersPageClient
      initialRows={initialRows}
      total={data.total}
      params={params}
      plans={plans.map((p) => ({ id: p.id, code: p.code, name: p.name }))}
      currentUserId={me?.id ?? ""}
    />
  );
}
