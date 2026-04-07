import { Suspense } from "react";
import { CheckoutResultToast } from "@/components/billing/checkout-result-toast";
import { BillingPaywallProvider } from "@/components/billing/billing-paywall-context";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { DashboardTooltipProvider } from "@/components/layout/dashboard-tooltip-provider";

type Props = {
  user: { name?: string | null; email?: string | null };
  children: React.ReactNode;
};

export function AppShell({ user, children }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <Topbar user={user} />
          <DashboardTooltipProvider>
            <BillingPaywallProvider>
              <Suspense fallback={null}>
                <CheckoutResultToast />
              </Suspense>
              <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
            </BillingPaywallProvider>
          </DashboardTooltipProvider>
        </div>
      </div>
    </div>
  );
}
