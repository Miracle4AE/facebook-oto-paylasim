import { decryptSecret } from "@/lib/crypto/token-vault";
import type { FacebookAccountRow } from "@/lib/prisma-schema-types";

/**
 * Sayfa erişim anahtarını çözer: önce şifreli alan, yoksa eski düz metin (geçiş dönemi).
 */
export function getFacebookAccountPlainToken(acc: FacebookAccountRow): string {
  if (acc.accessTokenEnc?.trim()) {
    const d = decryptSecret(acc.accessTokenEnc);
    if (d) return d;
  }
  if (acc.accessToken?.trim()) {
    return acc.accessToken.trim();
  }
  return "";
}
