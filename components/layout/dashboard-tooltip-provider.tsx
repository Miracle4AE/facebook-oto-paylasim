"use client";

import { TooltipProvider } from "@/components/ui/tooltip";

export function DashboardTooltipProvider({ children }: { children: React.ReactNode }) {
  return <TooltipProvider delayDuration={280} skipDelayDuration={200}>{children}</TooltipProvider>;
}
