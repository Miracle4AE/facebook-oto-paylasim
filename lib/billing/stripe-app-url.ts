/**
 * Checkout success/cancel URL’leri için kanonik taban adres.
 */
export function getAppBaseUrl(): string {
  const fromPublic = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const fromAuth = process.env.NEXTAUTH_URL?.trim();
  const raw = fromPublic ?? fromAuth ?? "http://localhost:3000";
  return raw.replace(/\/$/, "");
}
