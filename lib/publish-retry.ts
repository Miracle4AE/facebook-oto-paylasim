/** Exponential backoff üst sınırı (ms) — yaklaşık 1 saat */
const MAX_DELAY_MS = 3_600_000;
/** Taban gecikme (ms) — 1 dakika */
const BASE_DELAY_MS = 60_000;
/** Jitter üst sınırı (ms) — aynı anda çakışmayı azaltır */
const MAX_JITTER_MS = 8_000;

/**
 * `attemptNumber`: bu çalıştırma için deneme sırası (1 tabanlı, claim sonrası attempts değeri).
 */
export function computeNextRetryAt(attemptNumber: number, nowMs: number = Date.now()): Date {
  const n = Math.max(1, attemptNumber);
  const exp = Math.min(BASE_DELAY_MS * Math.pow(2, n - 1), MAX_DELAY_MS);
  const jitter = Math.floor(Math.random() * MAX_JITTER_MS);
  return new Date(nowMs + exp + jitter);
}
