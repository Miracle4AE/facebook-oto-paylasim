import { NextResponse } from "next/server";
import { getStripePriceIdForPlan } from "@/lib/billing/stripe-price-ids";
import { isStripeSecretConfigured } from "@/lib/stripe";
import { SubscriptionPlanCode } from "@/types/domain";

export const runtime = "nodejs";

/** İstemcinin ödeme butonlarını göstermesi için (fiyat id’leri + secret tanımlı mı) */
export async function GET() {
  const ready =
    isStripeSecretConfigured() &&
    Boolean(getStripePriceIdForPlan(SubscriptionPlanCode.BASIC)) &&
    Boolean(getStripePriceIdForPlan(SubscriptionPlanCode.PRO)) &&
    Boolean(getStripePriceIdForPlan(SubscriptionPlanCode.PREMIUM));

  return NextResponse.json({ ready });
}
