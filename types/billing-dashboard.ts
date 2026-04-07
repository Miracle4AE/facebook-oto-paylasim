/**
 * Dashboard faturalama kartı — sunucu DTO’su; Prisma’dan bağımsız (istemci güvenli import).
 */
export type BillingDashboardDTO = {
  planCode: string;
  planName: string;
  maxGroupTargets: number;
  dailyShareFlowLimit: number | null;
  groupCount: number;
  showUpgradeHint: boolean;
  subscriptionEndAt: string | null;
  isTrialLike: boolean;
  /** 0–100, sınırlı planda grup kullanımı */
  groupPercent: number;
  bulkFlowsToday: number;
  showTrialExpiredBanner: boolean;
  trialCountdownLine: string | null;
  trialEndedLine: string | null;
  primaryUpgradeLine: string | null;
  softPressureLine: string | null;
  showUsageProgress: boolean;
};
