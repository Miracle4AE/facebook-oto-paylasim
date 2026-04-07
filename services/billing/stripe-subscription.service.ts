import type Stripe from "stripe";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { ManualPaymentMethod, PaymentRecordStatus, SubscriptionPlanCode } from "@/types/domain";

function assertPurchasablePlan(code: string): asserts code is SubscriptionPlanCode {
  if (
    code !== SubscriptionPlanCode.BASIC &&
    code !== SubscriptionPlanCode.PRO &&
    code !== SubscriptionPlanCode.PREMIUM
  ) {
    throw new Error(`Geçersiz plan: ${code}`);
  }
}

/**
 * Stripe Subscription nesnesinden yerel UserSubscription + müşteri kaydı (idempotent).
 * checkout.session ve invoice.paid sırası garanti olmadığı için ortak kullanılır.
 */
export async function upsertUserSubscriptionFromStripeSubscription(
  subscription: Stripe.Subscription,
): Promise<void> {
  const userId = subscription.metadata?.userId?.trim();
  const planCodeRaw = subscription.metadata?.planCode?.trim();
  if (!userId || !planCodeRaw) {
    throw new Error("subscription.metadata: userId veya planCode eksik");
  }
  assertPurchasablePlan(planCodeRaw);
  const planCode = planCodeRaw;

  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const subscriptionId = subscription.id;

  const plan = await prisma.subscriptionPlan.findUnique({
    where: { code: planCode },
    select: { id: true },
  });
  if (!plan) {
    throw new Error(`Plan bulunamadı: ${planCode}`);
  }

  const startAt = new Date(subscription.current_period_start * 1000);
  const endAt = new Date(subscription.current_period_end * 1000);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customerId },
    });

    const existing = await tx.userSubscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
      select: { id: true },
    });

    if (existing) {
      await tx.userSubscription.update({
        where: { id: existing.id },
        data: { startAt, endAt, paymentStatus: "PAID" },
      });
      return;
    }

    await tx.userSubscription.updateMany({
      where: { userId, endAt: { gt: now } },
      data: { endAt: now },
    });

    await tx.userSubscription.create({
      data: {
        userId,
        planId: plan.id,
        startAt,
        endAt,
        paymentStatus: "PAID",
        paymentNote: `Stripe · ${subscriptionId}`,
        autoRenew: true,
        stripeSubscriptionId: subscriptionId,
      },
    });
  });
}

export async function activateSubscriptionFromCheckoutSession(session: Stripe.Checkout.Session): Promise<void> {
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;
  if (!subscriptionId) {
    throw new Error("checkout.session: subscription yok");
  }
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await upsertUserSubscriptionFromStripeSubscription(subscription);
}

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const sub = invoice.subscription;
  if (typeof sub === "string") return sub;
  if (sub && typeof sub === "object" && "id" in sub) return sub.id;
  return null;
}

export async function recordInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  await upsertUserSubscriptionFromStripeSubscription(subscription);

  const userId = subscription.metadata?.userId?.trim();
  if (!userId) return;

  const existing = await prisma.userSubscription.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
    select: { id: true, planId: true },
  });
  if (!existing) return;

  const amountTry = new Prisma.Decimal((invoice.amount_paid / 100).toFixed(2));
  const paidAt = invoice.status_transitions?.paid_at
    ? new Date(invoice.status_transitions.paid_at * 1000)
    : new Date(invoice.created * 1000);

  const dup = await prisma.paymentRecord.findFirst({
    where: { note: { contains: `stripe_invoice:${invoice.id}` } },
    select: { id: true },
  });
  if (dup) return;

  await prisma.paymentRecord.create({
    data: {
      userId,
      planId: existing.planId,
      amount: amountTry,
      currency: (invoice.currency ?? "try").toUpperCase(),
      paidAt,
      method: ManualPaymentMethod.STRIPE,
      status: PaymentRecordStatus.COMPLETED,
      note: `stripe_invoice:${invoice.id} · Stripe`,
    },
  });
}

export async function deactivateSubscriptionByStripeId(stripeSubscriptionId: string): Promise<void> {
  const row = await prisma.userSubscription.findFirst({
    where: { stripeSubscriptionId },
    select: { id: true },
  });
  if (!row) return;
  const now = new Date();
  await prisma.userSubscription.update({
    where: { id: row.id },
    data: { endAt: now, autoRenew: false, paymentStatus: "FAILED" },
  });
}
