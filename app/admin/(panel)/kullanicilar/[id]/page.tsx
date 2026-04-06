import { notFound } from "next/navigation";
import { AdminUserDetailView } from "@/components/admin/admin-user-detail-view";
import { getSessionUser } from "@/lib/session";
import { listSubscriptionPlans } from "@/services/admin/subscription-plan.service";
import { getUserAdminDetail } from "@/services/admin/user-admin-list.service";

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, plans, me] = await Promise.all([
    getUserAdminDetail(id),
    listSubscriptionPlans(),
    getSessionUser(),
  ]);
  if (!data) notFound();

  const serialized = JSON.parse(JSON.stringify(data)) as typeof data;

  return (
    <AdminUserDetailView
      data={serialized}
      plans={plans.map((p) => ({ id: p.id, code: p.code, name: p.name }))}
      currentUserId={me?.id ?? ""}
    />
  );
}
