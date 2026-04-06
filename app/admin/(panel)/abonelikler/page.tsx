import { AdminSubscriptionsView } from "@/components/admin/admin-subscriptions-view";
import { listSubscriptionPlans, listUserSubscriptionsForAdmin } from "@/services/admin/subscription-plan.service";

export default async function AdminSubscriptionsPage() {
  const [plans, subs] = await Promise.all([listSubscriptionPlans(), listUserSubscriptionsForAdmin()]);

  const serialized = subs.map((s: (typeof subs)[number]) => ({
    id: s.id,
    startAt: s.startAt.toISOString(),
    endAt: s.endAt.toISOString(),
    paymentStatus: s.paymentStatus,
    user: {
      id: s.user.id,
      email: s.user.email,
      name: s.user.name,
      archivedAt: s.user.archivedAt?.toISOString() ?? null,
    },
    plan: { name: s.plan.name, code: s.plan.code },
  }));

  return <AdminSubscriptionsView plans={plans} subscriptions={serialized} />;
}
