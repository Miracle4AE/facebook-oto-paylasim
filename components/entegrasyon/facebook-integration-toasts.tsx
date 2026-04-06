"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const FB_ERROR_LABELS: Record<string, string> = {
  config: "Facebook uygulama kimlik bilgileri (FACEBOOK_APP_ID / FACEBOOK_APP_SECRET) eksik.",
  token_exchange: "Yetkilendirme kodu token ile değiştirilemedi.",
  long_lived: "Uzun ömürlü kullanıcı token’ı alınamadı.",
  pages_list: "Sayfa listesi alınamadı.",
  no_pages: "Erişilebilir Facebook sayfası bulunamadı.",
  invalid_state: "OAuth durumu geçersiz veya süresi dolmuş (yeniden deneyin).",
  missing_params: "Facebook yanıtı eksik.",
};

type Props = {
  fbError: string | null;
  fbDesc: string | null;
  showConnected: boolean;
};

export function FacebookIntegrationToasts({ fbError, fbDesc, showConnected }: Props) {
  const router = useRouter();

  useEffect(() => {
    if (showConnected) {
      toast.success("Facebook sayfası bağlandı.");
      router.replace("/entegrasyon");
      return;
    }
    if (fbError) {
      const base = FB_ERROR_LABELS[fbError] ?? fbError;
      const msg = fbDesc ? `${base} (${fbDesc})` : base;
      toast.error(msg, { duration: 10_000 });
      router.replace("/entegrasyon");
    }
  }, [fbError, fbDesc, showConnected, router]);

  return null;
}
