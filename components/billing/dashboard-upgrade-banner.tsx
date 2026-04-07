"use client";

import { ArrowUpRight, Sparkles, Timer } from "lucide-react";
import type { BillingDashboardDTO } from "@/types/billing-dashboard";
import { useBillingPaywall } from "@/components/billing/billing-paywall-context";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type Props = {
  billing: BillingDashboardDTO;
};

const btnHighlight = "motion-safe:animate-pulse motion-safe:ring-2 motion-safe:ring-primary/35";

export function DashboardUpgradeBanner({ billing }: Props) {
  const paywall = useBillingPaywall();

  const hasAnything =
    billing.showUpgradeHint ||
    billing.trialCountdownLine ||
    billing.trialEndedLine ||
    billing.primaryUpgradeLine ||
    billing.softPressureLine;

  if (!hasAnything) return null;

  const showCoreBanner =
    billing.primaryUpgradeLine != null || (billing.showUsageProgress && billing.showUpgradeHint);

  return (
    <div className="space-y-3">
      {billing.trialCountdownLine && billing.isTrialLike && (
        <div className="flex flex-col gap-2 rounded-lg border border-primary/35 bg-primary/8 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-sm font-medium leading-relaxed text-foreground">
            <Timer className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            {billing.trialCountdownLine}
          </p>
          {paywall && (
            <Button
              type="button"
              size="sm"
              className={cn("shrink-0 gap-1 bg-primary text-primary-foreground", btnHighlight)}
              onClick={() => paywall.openPaywall(billing.trialCountdownLine ?? undefined)}
            >
              Daha fazla kişiye ulaş
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {billing.showTrialExpiredBanner && billing.trialEndedLine && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
          <p className="leading-relaxed">{billing.trialEndedLine}</p>
          {paywall && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className={cn("mt-3 gap-1", btnHighlight)}
              onClick={() => paywall.openPaywall(billing.trialEndedLine ?? undefined)}
            >
              <Sparkles className="h-4 w-4" />
              Sınırları kaldır
            </Button>
          )}
        </div>
      )}

      {showCoreBanner && (
        <div className="flex flex-col gap-3 rounded-lg border border-border/80 bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            {billing.showUsageProgress && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Grup hedefi kullanımı</span>
                  <span className="tabular-nums font-medium text-foreground">
                    {billing.groupCount} / {billing.maxGroupTargets}
                  </span>
                </div>
                <Progress value={billing.groupPercent} />
              </div>
            )}
            {billing.primaryUpgradeLine && (
              <p className="text-sm leading-relaxed text-foreground/90">{billing.primaryUpgradeLine}</p>
            )}
          </div>
          {paywall && billing.showUpgradeHint && (
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                size="sm"
                className={cn("gap-1 bg-primary text-primary-foreground", btnHighlight)}
                onClick={() => paywall.openPaywall(billing.primaryUpgradeLine ?? undefined)}
              >
                Daha fazla kişiye ulaş
                <ArrowUpRight className="h-4 w-4" />
              </Button>
              <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => paywall.openPaywall()}>
                Sınırları kaldır
              </Button>
            </div>
          )}
        </div>
      )}

      {billing.softPressureLine && (
        <p className="text-center text-xs leading-relaxed text-muted-foreground sm:text-left">{billing.softPressureLine}</p>
      )}
    </div>
  );
}
