"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const FB_ERROR_LABELS: Record<string, string> = {
  config: "Facebook uygulama kimlik bilgileri (FACEBOOK_APP_ID / FACEBOOK_APP_SECRET) eksik.",
  token_exchange: "Yetkilendirme kodu oturum anahtarına çevrilemedi. Uygulama yönlendirme URI’sini Meta’da kontrol edin.",
  long_lived: "Uzun ömürlü oturum anahtarı alınamadı. Bir süre sonra tekrar deneyin.",
  profile_fetch: "Facebook profil bilgisi okunamadı. Oturumu kapatıp yeniden bağlanın.",
  pages_list: "Sayfa listesi alınamadı (bu adım şu an ilk bağlantıda kullanılmıyor).",
  no_pages: "Erişilebilir Facebook sayfası bulunamadı.",
  invalid_state: "Bağlantı oturumu geçersiz veya süresi doldu. Yeniden “Facebook bağla” ile deneyin.",
  missing_params: "Facebook’tan eksik yanıt geldi. Tekrar deneyin.",
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
          "Facebook hesabınız panele bağlandı. Sayfa paylaşımı için ileride ek izinler eklenebilir; şimdilik yalnızca hesap doğrulaması yapıldı.",
        );
      } else {
        toast.success("Facebook bağlantısı tamamlandı.");
      }
      router.replace("/entegrasyon");
      return;
    }
    if (fbError) {
      const base = FB_ERROR_LABELS[fbError] ?? "Facebook bağlantısı tamamlanamadı.";
      const raw = (fbDesc ?? "").trim();
      const msg = raw !== "" && !raw.includes("error_code") ? `${base} ${raw}` : base;
      toast.error(msg, { duration: 10_000 });
      router.replace("/entegrasyon");
    }
  }, [fbError, fbDesc, showConnected, connectedAsUserIdentity, router]);

  return null;
}
