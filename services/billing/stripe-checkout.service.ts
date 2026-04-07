import { prisma } from "@/lib/prisma";
import { getAppBaseUrl } from "@/lib/billing/stripe-app-url";
import { getStripePriceIdForPlan, isPurchasablePlanCode } from "@/lib/billing/stripe-price-ids";
import { getStripe, isStripeSecretConfigured } from "@/lib/stripe";

export type CreateCheckoutResult =
  | { ok: true; url: string }
  | { ok: false; error: string; code: "UNAUTHORIZED" | "BAD_REQUEST" | "CONFIG" | "STRIPE" };

/**
 * Oturum açmış kullanıcı için Stripe Checkout (subscription) oturumu oluşturur.
 * Fiyat id’leri yalnızca sunucudan okunur; istemci plan kodunu gönderir.
 */
export async function createStripeCheckoutSession(params: {
  userId: string;
  userEmail: string;
  planCode: string;
}): Promise<CreateCheckoutResult> {
  if (!isStripeSecretConfigured()) {
    return { ok: false, error: "Ödeme altyapısı yapılandırılmamış.", code: "CONFIG" };
  }

  if (!isPurchasablePlanCode(params.planCode)) {
    return { ok: false, error: "Geçersiz plan seçimi.", code: "BAD_REQUEST" };
  }

  const priceId = getStripePriceIdForPlan(params.planCode);
  if (!priceId) {
    return {
      ok: false,
      error: "Bu plan için Stripe fiyat kimliği tanımlı değil (STRIPE_PRICE_ID_*).",
      code: "CONFIG",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, email: true, stripeCustomerId: true },
  });
  if (!user) {
    return { ok: false, error: "Kullanıcı bulunamadı.", code: "BAD_REQUEST" };
  }

  const base = getAppBaseUrl();
  const stripe = getStripe();

  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${base}/dashboard?checkout=success`,
        cancel_url: `${base}/dashboard?checkout=cancelled`,
        client_reference_id: user.id,
        metadata: {
          userId: user.id,
          planCode: params.planCode,
        },
        subscription_data: {
          metadata: {
            userId: user.id,
            planCode: params.planCode,
          },
        },
        ...(user.stripeCustomerId
          ? { customer: user.stripeCustomerId }
          : { customer_email: user.email ?? params.userEmail }),
        allow_promotion_codes: true,
        billing_address_collection: "auto",
        tax_id_collection: { enabled: false },
      },
    );

    if (!session.url) {
      return { ok: false, error: "Checkout URL oluşturulamadı.", code: "STRIPE" };
    }

    return { ok: true, url: session.url };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stripe hatası";
    return { ok: false, error: msg, code: "STRIPE" };
  }
}
