import { AdminPaymentsClient } from "@/components/admin/admin-payments-client";
import { listPaymentRecords } from "@/services/admin/payment-admin.service";
import { listSubscriptionPlans } from "@/services/admin/subscription-plan.service";
import { prisma } from "@/lib/prisma";

export default async function AdminPaymentsPage() {
  const [rows, plans, users] = await Promise.all([
    listPaymentRecords(),
    listSubscriptionPlans(),
    prisma.user.findMany({
      where: { archivedAt: null },
      select: { id: true, email: true, name: true },
      orderBy: { email: "asc" },
      take: 500,
    }),
  ]);

  return (
    <AdminPaymentsClient
      initialRows={rows}
      plans={plans.map((p) => ({ id: p.id, code: p.code, name: p.name }))}
      users={users}
    />
  );
}
