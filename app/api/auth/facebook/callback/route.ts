import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma, prismaFacebookOAuth } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto/token-vault";
import {
  exchangeAuthorizationCode,
  exchangeForLongLivedUserToken,
  fetchUserManagedPages,
} from "@/services/facebook/facebook-oauth.service";
import { appLogger } from "@/services/logging/app-logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const base = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateId = url.searchParams.get("state");
  const err = url.searchParams.get("error");
  const errDesc = url.searchParams.get("error_description");

  if (err) {
    return NextResponse.redirect(
      new URL(
        `/entegrasyon?fb_error=${encodeURIComponent(err)}&fb_desc=${encodeURIComponent(errDesc ?? "")}`,
        base,
      ),
    );
  }
  if (!code || !stateId) {
    return NextResponse.redirect(new URL("/entegrasyon?fb_error=missing_params", base));
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", base));
  }

  const state = await prismaFacebookOAuth.findFirst({
    where: { id: stateId, userId: session.user.id, expiresAt: { gt: new Date() } },
  });
  if (!state) {
    return NextResponse.redirect(new URL("/entegrasyon?fb_error=invalid_state", base));
  }

  const short = await exchangeAuthorizationCode(code);
  if (!short.ok) {
    appLogger.warn("facebook.oauth.short_token_failed", { userId: session.user.id });
    return NextResponse.redirect(new URL("/entegrasyon?fb_error=token_exchange", base));
  }

  const long = await exchangeForLongLivedUserToken(short.accessToken);
  if (!long.ok) {
    return NextResponse.redirect(new URL("/entegrasyon?fb_error=long_lived", base));
  }

  const pagesRes = await fetchUserManagedPages(long.accessToken);
  if (!pagesRes.ok) {
    return NextResponse.redirect(new URL("/entegrasyon?fb_error=pages_list", base));
  }

  if (pagesRes.pages.length === 0) {
    await prismaFacebookOAuth.delete({ where: { id: stateId } });
    return NextResponse.redirect(new URL("/entegrasyon?fb_error=no_pages", base));
  }

  const payload = { pages: pagesRes.pages };
  const enc = encryptSecret(JSON.stringify(payload));

  if (pagesRes.pages.length === 1) {
    const p = pagesRes.pages[0]!;
    await prisma.facebookAccount.create({
      data: {
        userId: session.user.id,
        label: p.name,
        accessTokenEnc: encryptSecret(p.access_token),
        pageId: p.id,
        externalId: p.id,
        isActive: true,
      } as Prisma.FacebookAccountUncheckedCreateInput,
    });
    await prismaFacebookOAuth.delete({ where: { id: stateId } });
    appLogger.info("facebook.oauth.auto_connected", { userId: session.user.id, pageId: p.id });
    return NextResponse.redirect(new URL("/entegrasyon?fb_connected=1", base));
  }

  await prismaFacebookOAuth.update({
    where: { id: stateId },
    data: { payloadEnc: enc },
  });
  return NextResponse.redirect(new URL(`/entegrasyon?fb_pending=${stateId}`, base));
}
