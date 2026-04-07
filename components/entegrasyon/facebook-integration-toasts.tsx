"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const FB_ERROR_LABELS: Record<string, string> = {
  config: "Facebook uygulama kimlik bilgileri (FACEBOOK_APP_ID / FACEBOOK_APP_SECRET) eksik.",
  token_exchange: "Yetkilendirme kodu oturum anahtarına çevrilemedi. Uygulama yönlendirme adresini Meta’da kontrol edin.",
  long_lived: "Uzun ömürlü oturum anahtarı alınamadı. Bir süre sonra tekrar deneyin.",
  profile_fetch: "Facebook profil bilgisi okunamadı. Oturumu kapatıp yeniden bağlanın.",
  pages_list: "Sayfa listesi alınamadı (bu adım ilk bağlantıda kullanılmıyor).",
  no_pages: "Erişilebilir Facebook sayfası bulunamadı.",
  invalid_state: "Bağlantı oturumu geçersiz veya süresi doldu. Yeniden “Facebook bağla” ile deneyin.",
  missing_params: "Facebook’tan eksik yanıt geldi. Tekrar deneyin.",
  invalid_scope: "İstenen izinler bu uygulama için onaylı görünmüyor. Uygulama ayarlarınızı kontrol edin.",
  invalid_scopes: "İstenen izinler bu uygulama için onaylı görünmüyor. Uygulama ayarlarınızı kontrol edin.",
};

type Props = {
  fbError: string | null;
  fbDesc: string | null;
  showConnected: boolean;
  /** OAuth sonrası: şimdilik yalnızca kullanıcı kimliği (sayfa token’ı yok) */
  connectedAsUserIdentity?: boolean;
};

export function FacebookIntegrationToasts({
  fbError,
  fbDesc,
  showConnected,
  connectedAsUserIdentity,
}: Props) {
  const router = useRouter();

  useEffect(() => {
    if (showConnected) {
      if (connectedAsUserIdentity) {
        toast.success(
          "İlk bağlantı temel hesap doğrulaması yaptı. Gelişmiş izinler (sayfa paylaşımı vb.) sonraki aşamada alınabilir.",
        );
      } else {
        toast.success("Facebook bağlantısı tamamlandı.");
      }
      router.replace("/entegrasyon");
      return;
    }
    if (fbError) {
      const mapped = FB_ERROR_LABELS[fbError] ?? "Facebook bağlantısı tamamlanamadı.";
      const detail = (fbDesc ?? "").trim();
      // Callback yalnızca Türkçe fb_desc üretir; ham Meta metni gösterme
      const msg = detail.length > 0 ? detail : mapped;
      toast.error(msg, { duration: 10_000 });
      router.replace("/entegrasyon");
    }
  }, [fbError, fbDesc, showConnected, connectedAsUserIdentity, router]);

  return null;
}
