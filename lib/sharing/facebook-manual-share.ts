/**
 * Facebook grup paylaşımı: tam otomasyon yok; kullanıcı tetiklemeli sekme + pano yardımcıları.
 * Tarayıcı popup politikalarına uyum için tüm toplu açma işlemleri kullanıcı tıklamasından çağrılmalıdır.
 */

export const FACEBOOK_MANUAL_GROUP_MAX_TABS = 20;

/** Ardışık sekme açılışları arası minimum gecikme (ms) */
export const FACEBOOK_MANUAL_GROUP_DELAY_MIN_MS = 500;

/** Ardışık sekme açılışları arası maksimum gecikme (ms) */
export const FACEBOOK_MANUAL_GROUP_DELAY_MAX_MS = 800;

/** Aynı oturumda "tümünü aç" için istemci tarafı soğuma (spam önleme, ms) */
export const FACEBOOK_MANUAL_GROUP_BULK_COOLDOWN_MS = 30_000;

function randomDelayMs(): number {
  const span =
    FACEBOOK_MANUAL_GROUP_DELAY_MAX_MS - FACEBOOK_MANUAL_GROUP_DELAY_MIN_MS;
  return FACEBOOK_MANUAL_GROUP_DELAY_MIN_MS + Math.floor(Math.random() * (span + 1));
}

/**
 * Metinden ilk http(s) URL’sini döndürür; yaygın sondaki noktalama karakterlerini kırpar.
 */
export function extractFirstHttpUrl(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;
  const match = trimmed.match(/https?:\/\/[^\s<>"')\]}]+/i);
  if (!match) return null;
  let candidate = match[0];
  candidate = candidate.replace(/[.,;:!?)'"\]]+$/, "");
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export function buildFacebookSharerUrl(pageUrl: string): string {
  const u = new URL("https://www.facebook.com/sharer/sharer.php");
  u.searchParams.set("u", pageUrl);
  return u.toString();
}

export function buildShareablePlainText(params: {
  title: string | null;
  body: string;
}): string {
  const t = params.title?.trim() ?? "";
  const b = params.body.trim();
  if (t.length > 0 && b.length > 0) return `${t}\n\n${b}`;
  if (t.length > 0) return t;
  return b;
}

export type OpenSequentialResult = {
  attempted: number;
  opened: number;
  blockedOrFailed: number;
};

/**
 * Kullanıcı jesti içinde çağrılmalıdır. Her URL için `window.open`, aralarında rastgele gecikme.
 */
export async function openUrlsInNewTabsSequential(urls: readonly string[]): Promise<OpenSequentialResult> {
  const capped = urls.slice(0, FACEBOOK_MANUAL_GROUP_MAX_TABS);
  let opened = 0;
  let blockedOrFailed = 0;

  for (let i = 0; i < capped.length; i++) {
    const w = window.open(capped[i], "_blank", "noopener,noreferrer");
    if (w) {
      opened += 1;
    } else {
      blockedOrFailed += 1;
    }
    if (i < capped.length - 1) {
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, randomDelayMs());
      });
    }
  }

  return {
    attempted: capped.length,
    opened,
    blockedOrFailed,
  };
}

export function isBulkOpenAllowed(lastAtMs: number, nowMs: number): boolean {
  return nowMs - lastAtMs >= FACEBOOK_MANUAL_GROUP_BULK_COOLDOWN_MS;
}
