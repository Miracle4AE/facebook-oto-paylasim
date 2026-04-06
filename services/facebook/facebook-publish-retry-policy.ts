/**
 * Kalıcı yapılandırma / kimlik hatalarında yeniden denemek işe yaramaz ve sonsuz kuyruk oluşturur.
 * Geçici (ağ, kota, 5xx) hatalarda backoff ile tekrar denemek mantıklıdır.
 */
const NON_RETRYABLE = new Set<string>([
  "CONFIG",
  "TOKEN_EXPIRED",
  "INVALID_TOKEN",
  "PERMISSION_DENIED",
  "UNSUPPORTED_TARGET",
  "MISSING_PAGE_ID",
  "GRAPH_CLIENT",
  "MEDIA_UPLOAD_FAILED",
]);

export function shouldRetryFacebookPublish(errorCode: string | undefined): boolean {
  if (!errorCode) return false;
  if (NON_RETRYABLE.has(errorCode)) return false;
  return true;
}
