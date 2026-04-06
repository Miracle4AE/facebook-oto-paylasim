import { FACEBOOK_GRAPH_VERSION, getFacebookAppCredentials, getFacebookOAuthRedirectUri } from "./facebook-graph-env";
import { mapGraphHttpToPublishResult } from "./facebook-graph-errors";
import type { FacebookPublishResult } from "./facebook-publish.types";
import { getFacebookPublishUserMessage } from "./facebook-user-messages";

export type FacebookPageRow = {
  id: string;
  name: string;
  access_token: string;
};

type TokenExchangeOk = { access_token: string; expires_in?: number };

/**
 * Kısa ömürlü kullanıcı erişim anahtarı (code exchange).
 */
export async function exchangeAuthorizationCode(code: string): Promise<
  { ok: true; accessToken: string; expiresInSec?: number } | { ok: false; result: FacebookPublishResult }
> {
  const cred = getFacebookAppCredentials();
  if (!cred) {
    return {
      ok: false,
      result: {
        success: false,
        errorCode: "CONFIG",
        errorMessage: "FACEBOOK_APP_ID / FACEBOOK_APP_SECRET tanımlı değil.",
        userMessage: getFacebookPublishUserMessage("CONFIG"),
      },
    };
  }
  const redirectUri = getFacebookOAuthRedirectUri();
  const url = new URL(`https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/oauth/access_token`);
  url.searchParams.set("client_id", cred.appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("client_secret", cred.appSecret);
  url.searchParams.set("code", code);

  const res = await fetch(url.toString());
  const data = (await res.json()) as TokenExchangeOk & { error?: unknown };
  if (!res.ok || !data.access_token) {
    return {
      ok: false,
      result: mapGraphHttpToPublishResult(res.status, data as Record<string, unknown>, {
        endpoint: `/${FACEBOOK_GRAPH_VERSION}/oauth/access_token`,
        method: "GET",
      }),
    };
  }
  return {
    ok: true,
    accessToken: data.access_token,
    expiresInSec: typeof data.expires_in === "number" ? data.expires_in : undefined,
  };
}

/**
 * Uzun ömürlü kullanıcı erişim anahtarı.
 */
export async function exchangeForLongLivedUserToken(shortLivedUserToken: string): Promise<
  { ok: true; accessToken: string; expiresInSec?: number } | { ok: false; result: FacebookPublishResult }
> {
  const cred = getFacebookAppCredentials();
  if (!cred) {
    return {
      ok: false,
      result: {
        success: false,
        errorCode: "CONFIG",
        errorMessage: "FACEBOOK_APP_ID / FACEBOOK_APP_SECRET tanımlı değil.",
        userMessage: getFacebookPublishUserMessage("CONFIG"),
      },
    };
  }
  const url = new URL(`https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", cred.appId);
  url.searchParams.set("client_secret", cred.appSecret);
  url.searchParams.set("fb_exchange_token", shortLivedUserToken);

  const res = await fetch(url.toString());
  const data = (await res.json()) as TokenExchangeOk & { error?: unknown };
  if (!res.ok || !data.access_token) {
    return {
      ok: false,
      result: mapGraphHttpToPublishResult(res.status, data as Record<string, unknown>, {
        endpoint: `/${FACEBOOK_GRAPH_VERSION}/oauth/access_token`,
        method: "GET",
      }),
    };
  }
  return {
    ok: true,
    accessToken: data.access_token,
    expiresInSec: typeof data.expires_in === "number" ? data.expires_in : undefined,
  };
}

export async function fetchUserManagedPages(userAccessToken: string): Promise<
  { ok: true; pages: FacebookPageRow[] } | { ok: false; result: FacebookPublishResult }
> {
  const url = new URL(`https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/me/accounts`);
  url.searchParams.set("fields", "id,name,access_token");
  url.searchParams.set("access_token", userAccessToken);

  const res = await fetch(url.toString());
  const data = (await res.json()) as {
    data?: Array<{ id: string; name: string; access_token: string }>;
    error?: unknown;
  };
  if (!res.ok) {
    return {
      ok: false,
      result: mapGraphHttpToPublishResult(res.status, data as Record<string, unknown>, {
        endpoint: `/${FACEBOOK_GRAPH_VERSION}/me/accounts`,
        method: "GET",
      }),
    };
  }
  const rows = data.data ?? [];
  return {
    ok: true,
    pages: rows.map((r) => ({
      id: r.id,
      name: r.name,
      access_token: r.access_token,
    })),
  };
}
