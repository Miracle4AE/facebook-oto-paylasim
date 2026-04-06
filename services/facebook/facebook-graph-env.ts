export const FACEBOOK_GRAPH_VERSION = process.env.FACEBOOK_GRAPH_VERSION ?? "v21.0";

export function getFacebookAppCredentials(): { appId: string; appSecret: string } | null {
  const appId = process.env.FACEBOOK_APP_ID?.trim();
  const appSecret = process.env.FACEBOOK_APP_SECRET?.trim();
  if (!appId || !appSecret) return null;
  return { appId, appSecret };
}

export function getFacebookOAuthRedirectUri(): string {
  const base = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  return `${base}/api/auth/facebook/callback`;
}
