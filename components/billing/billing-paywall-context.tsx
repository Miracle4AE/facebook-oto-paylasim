"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { PlanComparisonModal } from "@/components/billing/plan-comparison-modal";

type BillingPaywall = {
  openPaywall: (reason?: string) => void;
};

const BillingPaywallContext = createContext<BillingPaywall | null>(null);

export function BillingPaywallProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | undefined>();

  const openPaywall = useCallback((r?: string) => {
    setReason(r);
    setOpen(true);
  }, []);

  const value = useMemo(() => ({ openPaywall }), [openPaywall]);

  return (
    <BillingPaywallContext.Provider value={value}>
      {children}
      <PlanComparisonModal open={open} onOpenChange={setOpen} reason={reason} />
    </BillingPaywallContext.Provider>
  );
}

export function useBillingPaywall(): BillingPaywall | null {
  return useContext(BillingPaywallContext);
}
