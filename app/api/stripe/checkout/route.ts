import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { createStripeCheckoutSession } from "@/services/billing/stripe-checkout.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false as const, error: "Oturum gerekli" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false as const, error: "Geçersiz istek gövdesi" }, { status: 400 });
  }

  const planCode = typeof (body as { planCode?: unknown }).planCode === "string"
    ? (body as { planCode: string }).planCode.trim()
    : "";

  if (!planCode) {
    return NextResponse.json({ ok: false as const, error: "planCode gerekli" }, { status: 400 });
  }

  const result = await createStripeCheckoutSession({
    userId: session.user.id,
    userEmail: session.user.email ?? "",
    planCode,
  });

  if (!result.ok) {
    const status =
      result.code === "BAD_REQUEST" ? 400 : result.code === "CONFIG" ? 503 : 500;
    return NextResponse.json({ ok: false as const, error: result.error }, { status });
  }

  return NextResponse.json({ ok: true as const, url: result.url });
}
