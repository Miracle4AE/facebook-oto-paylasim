import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prismaFacebookOAuth } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto/token-vault";
import {
  FACEBOOK_GRAPH_VERSION,
  getFacebookAppCredentials,
  getFacebookOAuthRedirectUri,
} from "@/services/facebook/facebook-graph-env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const base = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", base));
  }

  const cred = getFacebookAppCredentials();
  if (!cred) {
    return NextResponse.redirect(new URL("/entegrasyon?fb_error=config", base));
  }

  await prismaFacebookOAuth.deleteMany({
    where: { userId: session.user.id, expiresAt: { lt: new Date() } },
  });

  const state = await prismaFacebookOAuth.create({
    data: {
      userId: session.user.id,
      payloadEnc: encryptSecret("{}"),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });

  const redirectUri = encodeURIComponent(getFacebookOAuthRedirectUri());
  const scope = encodeURIComponent("pages_show_list,pages_manage_posts,pages_read_engagement");
  const authUrl = `https://www.facebook.com/${FACEBOOK_GRAPH_VERSION}/dialog/oauth?client_id=${cred.appId}&redirect_uri=${redirectUri}&state=${state.id}&scope=${scope}&response_type=code`;

  return NextResponse.redirect(authUrl);
}
