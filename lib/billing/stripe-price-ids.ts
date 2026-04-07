import { SubscriptionPlanCode } from "@/types/domain";

/** Stripe Checkout’ta satın alınabilir planlar (FREE hariç) */
export const STRIPE_CHECKOUT_PLAN_CODES = [
  SubscriptionPlanCode.BASIC,
  SubscriptionPlanCode.PRO,
  SubscriptionPlanCode.PREMIUM,
] as const;

export type StripeCheckoutPlanCode = (typeof STRIPE_CHECKOUT_PLAN_CODES)[number];

export function isPurchasablePlanCode(code: string): code is StripeCheckoutPlanCode {
  return (STRIPE_CHECKOUT_PLAN_CODES as readonly string[]).includes(code);
}

/**
 * Dashboard’da gösterilecek aylık fiyat (Stripe’da tanımlı tutarla aynı olmalı; sadece bilgi amaçlı).
 * Gerçek tahsilat Stripe fiyat nesnesindedir.
 */
export const DISPLAY_MONTHLY_PRICES_TRY: Record<StripeCheckoutPlanCode, string> = {
  [SubscriptionPlanCode.BASIC]: "₺199 / ay",
  [SubscriptionPlanCode.PRO]: "₺499 / ay",
  [SubscriptionPlanCode.PREMIUM]: "₺999 / ay",
};

export function getStripePriceIdForPlan(planCode: StripeCheckoutPlanCode): string | null {
  const map: Record<StripeCheckoutPlanCode, string | undefined> = {
    [SubscriptionPlanCode.BASIC]: process.env.STRIPE_PRICE_ID_BASIC?.trim(),
    [SubscriptionPlanCode.PRO]: process.env.STRIPE_PRICE_ID_PRO?.trim(),
    [SubscriptionPlanCode.PREMIUM]: process.env.STRIPE_PRICE_ID_PREMIUM?.trim(),
  };
  const id = map[planCode];
  return id && id.length > 0 ? id : null;
}

export function getStripePriceEnvStatus(): Record<StripeCheckoutPlanCode, boolean> {
  return {
    [SubscriptionPlanCode.BASIC]: getStripePriceIdForPlan(SubscriptionPlanCode.BASIC) != null,
    [SubscriptionPlanCode.PRO]: getStripePriceIdForPlan(SubscriptionPlanCode.PRO) != null,
    [SubscriptionPlanCode.PREMIUM]: getStripePriceIdForPlan(SubscriptionPlanCode.PREMIUM) != null,
  };
}
