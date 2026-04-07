import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma, prismaFacebookOAuth } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto/token-vault";
import { FACEBOOK_USER_ACCOUNT_NOTE_PREFIX } from "@/services/facebook/facebook-oauth-connect";
import {
  exchangeAuthorizationCode,
  exchangeForLongLivedUserToken,
  fetchFacebookUserProfile,
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
    const friendly = mapFacebookOAuthCallbackError(err, errDesc);
    return NextResponse.redirect(
      new URL(
        `/entegrasyon?fb_error=${encodeURIComponent(err)}&fb_desc=${encodeURIComponent(friendly)}`,
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
    return NextResponse.redirect(
      new URL(
        "/entegrasyon?fb_error=long_lived&fb_desc=" +
          encodeURIComponent("Uzun ömürlü oturum anahtarı alınamadı. Lütfen tekrar deneyin."),
        base,
      ),
    );
  }

  /** Faz 1: yalnızca temel scope’lar — sayfa listesi yok; kullanıcı kimliği `/me` ile doğrulanır. */
  const profileRes = await fetchFacebookUserProfile(long.accessToken);
  if (!profileRes.ok) {
    appLogger.warn("facebook.oauth.profile_failed", { userId: session.user.id });
    return NextResponse.redirect(
      new URL(
        "/entegrasyon?fb_error=profile_fetch&fb_desc=" +
          encodeURIComponent("Facebook profili okunamadı. Oturumu kapatıp tekrar deneyin."),
        base,
      ),
    );
  }

  const { profile } = profileRes;
  const expiresAt =
    typeof long.expiresInSec === "number" && long.expiresInSec > 0
      ? new Date(Date.now() + long.expiresInSec * 1000)
      : null;

  await prisma.facebookAccount.create({
    data: {
      userId: session.user.id,
      label: profile.name,
      accessTokenEnc: encryptSecret(long.accessToken),
      pageId: null,
      externalId: profile.id,
      isActive: true,
      notes: `${FACEBOOK_USER_ACCOUNT_NOTE_PREFIX} Kullanıcı ID: ${profile.id}.`,
      tokenExpiresAt: expiresAt,
    } as Prisma.FacebookAccountUncheckedCreateInput,
  });
  await prismaFacebookOAuth.delete({ where: { id: stateId } });
  appLogger.info("facebook.oauth.user_connected", { userId: session.user.id, fbUserId: profile.id });

  return NextResponse.redirect(new URL("/entegrasyon?fb_connected=1&fb_mode=user", base));
}

/**
 * Facebook’un `error` / `error_description` parametrelerini kullanıcıya ham metin olarak verme;
 * yalnızca Türkçe, genel mesajlar döndür.
 */
function mapFacebookOAuthCallbackError(err: string, errDesc: string | null): string {
  if (err === "access_denied") {
    return "Facebook girişi iptal edildi veya izin verilmedi.";
  }
  const code = err.trim().toLowerCase();
  if (code === "invalid_scope" || code === "invalid_scopes") {
    return "İstenen izinler bu uygulama için onaylı görünmüyor. Uygulama ayarlarınızı kontrol edin veya yöneticinize başvurun.";
  }
  const d = (errDesc ?? "").trim().toLowerCase();
  if (d.includes("invalid scopes") || d.includes("scope")) {
    return "İstenen izinler Meta tarafından kabul edilmedi. Uygulama ayarlarını ve izin listesini kontrol edin.";
  }
  return "Facebook yetkilendirmesi tamamlanamadı. Lütfen bir süre sonra tekrar deneyin.";
}
