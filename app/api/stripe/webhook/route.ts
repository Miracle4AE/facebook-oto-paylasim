import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeWebhookSecretConfigured } from "@/lib/stripe";
import {
  activateSubscriptionFromCheckoutSession,
  deactivateSubscriptionByStripeId,
  recordInvoicePaid,
} from "@/services/billing/stripe-subscription.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isStripeWebhookSecretConfigured()) {
    return NextResponse.json({ error: "Webhook yapılandırılmamış" }, { status: 503 });
  }

  const rawBody = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "stripe-signature yok" }, { status: 400 });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET!.trim();
  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch {
    return NextResponse.json({ error: "Geçersiz imza veya gövde" }, { status: 400 });
  }

  let created = false;
  try {
    await prisma.stripeWebhookEvent.create({
      data: { stripeEventId: event.id, type: event.type },
    });
    created = true;
  } catch {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription") {
          await activateSubscriptionFromCheckoutSession(session);
        }
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await recordInvoicePaid(invoice);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await deactivateSubscriptionByStripeId(sub.id);
        break;
      }
      default:
        break;
    }
  } catch (e) {
    if (created) {
      await prisma.stripeWebhookEvent.delete({ where: { stripeEventId: event.id } }).catch(() => {});
    }
    console.error("[stripe webhook]", event.type, e);
    return NextResponse.json({ error: "İşlem başarısız" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
