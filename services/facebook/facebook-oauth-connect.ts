import type { FacebookAccountRow } from "@/lib/prisma-schema-types";

/**
 * İlk OAuth adımı: yalnızca `public_profile` — `email` ve sayfa izinleri Meta’da sıkça
 * “Invalid Scopes” ürettiği için authorize URL’de istenmez (Faz 2’de ayrı onay akışı).
 */
export const FACEBOOK_OAUTH_CONNECT_SCOPES = ["public_profile"] as const;

/**
 * Faz 2 — sayfa listesi / paylaşım için (şu an authorize URL’de kullanılmıyor).
 * Uygulama incelemesi ve geçerli ürün ayarları Meta dokümantasyonundan doğrulanmalıdır.
 */
export const FACEBOOK_OAUTH_PAGE_MANAGEMENT_SCOPES = [
  "pages_show_list",
  "pages_manage_posts",
  "pages_read_engagement",
] as const;

export function buildFacebookOAuthScopeQueryParam(): string {
  return FACEBOOK_OAUTH_CONNECT_SCOPES.join(",");
}

/** Veritabanında kullanıcı token’ı ile yapılan ilk bağlantıyı işaretler (sayfa token’ı yok). */
export const FACEBOOK_USER_ACCOUNT_NOTE_PREFIX =
  "Kullanıcı oturumu (sayfa izinleri sonraki aşamada).";

export function isFacebookUserConnectionAccount(account: FacebookAccountRow): boolean {
  return (
    (account.pageId == null || account.pageId.trim() === "") &&
    Boolean(account.notes?.startsWith(FACEBOOK_USER_ACCOUNT_NOTE_PREFIX))
  );
}
