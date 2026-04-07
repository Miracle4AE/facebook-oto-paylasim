import { SubscriptionPlanCode } from "@/types/domain";

/** Aylık fiyat etiketleri — Stripe Dashboard’daki tutarlarla uyumlu tutun */
export { DISPLAY_MONTHLY_PRICES_TRY } from "@/lib/billing/stripe-price-ids";

/** Aboneliği olmayan kullanıcı için sanal ücretsiz plan limitleri */
export const VIRTUAL_FREE_LIMITS = {
  maxGroupTargets: 5,
  dailyShareFlowLimit: 1,
  dailyPublishLimit: 1,
} as const;

export type PlanMarketingRow = {
  code: string;
  name: string;
  blurb: string;
  groupLabel: string;
  flowLabel: string;
  highlight?: boolean;
  socialProof?: string;
};

/** Paywall / karşılaştırma metinleri (DB’den bağımsız, ürün mesajı) */
export const PLAN_MARKETING: PlanMarketingRow[] = [
  {
    code: SubscriptionPlanCode.FREE,
    name: "Ücretsiz",
    blurb: "Başlamak için yeterli",
    groupLabel: "En fazla 5 grup",
    flowLabel: "Günde 1 paylaşım akışı",
  },
  {
    code: SubscriptionPlanCode.BASIC,
    name: "Temel",
    blurb: "Küçük ekipler",
    groupLabel: "En fazla 20 grup",
    flowLabel: "Sınırsız akış",
    highlight: true,
    socialProof: "En hızlı büyüyen kullanıcılar bu planı tercih ediyor.",
  },
  {
    code: SubscriptionPlanCode.PRO,
    name: "Profesyonel",
    blurb: "Yoğun kullanım",
    groupLabel: "Sınırsız grup",
    flowLabel: "Sınırsız akış",
  },
  {
    code: SubscriptionPlanCode.PREMIUM,
    name: "Premium",
    blurb: "Tüm özellikler",
    groupLabel: "Sınırsız + öncelik",
    flowLabel: "Sınırsız akış",
  },
];

export const TRIAL_DAYS_PRO = 3;
