/**
 * Kullanıcıya gösterilen Türkçe mesajlar — ham Graph/HTTP metinleri doğrudan gösterilmez.
 * Kod → mesaj eşlemesi publish ve entegrasyon UI’ında ortaktır.
 */
const MESSAGES: Record<string, string> = {
  CONFIG:
    "Facebook uygulama kimlik bilgileri (FACEBOOK_APP_ID / FACEBOOK_APP_SECRET) tanımlı değil. Ortam değişkenlerini kontrol edin.",
  TOKEN_EXPIRED:
    "Facebook erişim anahtarının süresi dolmuş veya geçersiz. Entegrasyon sayfasından hesabı yeniden bağlayın.",
  INVALID_TOKEN:
    "Facebook erişim anahtarı geçersiz. Entegrasyon sayfasından yeni bir sayfa token’ı girin veya OAuth ile yeniden bağlanın.",
  PERMISSION_DENIED:
    "Bu sayfa için gerekli Meta izinleri yok (ör. paylaşım). İşletme ayarlarında uygulama ve sayfa rollerini kontrol edin.",
  RATE_LIMIT:
    "Facebook geçici olarak istek limiti uyguladı. Sistem otomatik olarak uygun süre sonra yeniden dener.",
  GRAPH_SERVER:
    "Facebook sunucuları geçici olarak yanıt veremedi. Lütfen bir süre sonra tekrar deneyin.",
  NETWORK:
    "Facebook’a bağlanılamadı. Ağ veya güvenlik duvarı kaynaklı olabilir; sistem yeniden denemeyi planlar.",
  GRAPH_ERROR:
    "Facebook isteği reddedildi. Entegrasyon ve hedef ayarlarınızı kontrol edin; ayrıntılar kayıtlarda saklanır.",
  GRAPH_CLIENT:
    "İstek parametreleri Facebook tarafından kabul edilmedi. İçerik ve hedef bilgilerini gözden geçirin.",
  UNSUPPORTED_TARGET:
    "Bu hedef türü bu entegrasyonla otomatik paylaşımı desteklemiyor (ör. grup veya profil).",
  MISSING_PAGE_ID:
    "Sayfa kimliği (Page ID) eksik. Hedef veya bağlı Facebook hesabında Page ID tanımlayın.",
  MEDIA_UPLOAD_FAILED:
    "Medya yüklenemedi veya gönderi oluşturulamadı. Dosya biçimi ve boyutunu kontrol edin.",
  GRAPH_UNKNOWN:
    "Facebook beklenmeyen bir yanıt verdi. Bir süre sonra yeniden deneyin.",
  NETWORK_TIMEOUT: "Facebook ile bağlantı zaman aşımına uğradı. Sistem yeniden denemeyi planlar.",
};

const DEFAULT_MESSAGE =
  "Facebook ile iletişimde bir sorun oluştu. Entegrasyon ayarlarınızı kontrol edin; teknik ayrıntılar kayıtlarda saklanır.";

export function getFacebookPublishUserMessage(errorCode: string | undefined): string {
  if (!errorCode) return DEFAULT_MESSAGE;
  return MESSAGES[errorCode] ?? DEFAULT_MESSAGE;
}

export function getFacebookHealthUserMessage(status: FacebookHealthUiStatus): string {
  switch (status) {
    case "connected":
      return "Bağlantı aktif; token geçerli görünüyor.";
    case "identity_connected":
      return "İlk bağlantı temel hesap doğrulaması yaptı. Gelişmiş izinler (sayfa paylaşımı vb.) sonraki aşamada alınabilir.";
    case "token_expired":
      return "Token süresi dolmuş. Entegrasyon’dan yeniden bağlanın veya yeni Page Access Token girin.";
    case "invalid_token":
      return "Token geçersiz veya bu sayfa için kullanılamıyor.";
    case "permission_denied":
      return "Sayfa erişim izni eksik. Meta’da uygulama ve sayfa izinlerini doğrulayın.";
    case "app_unconfigured":
      return "Uygulama kimlik bilgileri tanımlı değil; token doğrulaması yapılamıyor. FACEBOOK_APP_ID / SECRET ekleyin.";
    case "missing_page_id":
      return "Page ID eksik; token doğrulaması için hesaba Page ID ekleyin.";
    case "network":
      return "Facebook’a şu an ulaşılamıyor. Ağ veya Meta kesintisi olabilir.";
    case "unknown":
    default:
      return "Bağlantı durumu doğrulanamadı. Sayfayı yenileyin veya sonra tekrar deneyin.";
  }
}

export type FacebookHealthUiStatus =
  | "connected"
  | "identity_connected"
  | "token_expired"
  | "invalid_token"
  | "permission_denied"
  | "app_unconfigured"
  | "missing_page_id"
  | "network"
  | "unknown";
