import type { IFacebookPublishService } from "./facebook-publish.service";
import type { FacebookPublishContext, FacebookPublishPayload, FacebookPublishResult } from "./facebook-publish.types";
import { getFacebookPublishUserMessage } from "./facebook-user-messages";

type SimulatedError = {
  code: string;
  message: string;
};

const ERROR_SCENARIOS: SimulatedError[] = [
  { code: "RATE_LIMIT", message: "Meta API: istek kotası aşıldı (simülasyon)." },
  { code: "TOKEN_EXPIRED", message: "Erişim anahtarı geçersiz veya süresi dolmuş (simülasyon)." },
  { code: "PERMISSION_DENIED", message: "Bu hedef için publish izni yok (simülasyon)." },
  { code: "MEDIA_UPLOAD_FAILED", message: "Medya yüklemesi başarısız (simülasyon)." },
  { code: "NETWORK", message: "Ağ zaman aşımı (simülasyon)." },
  { code: "GRAPH_ERROR", message: "Graph API bilinmeyen hata (simülasyon)." },
];

/**
 * Graph entegrasyonu yokken gerçekçi başarı / hata dağılımı üretir.
 * FACEBOOK_MOCK_SUCCESS_RATE=0.65 gibi 0–1 arası oran (varsayılan ~%62 başarı).
 */
export class MockFacebookPublishService implements IFacebookPublishService {
  async publish(
    ctx: FacebookPublishContext,
    payload: FacebookPublishPayload,
  ): Promise<FacebookPublishResult> {
    const rate = Number(process.env.FACEBOOK_MOCK_SUCCESS_RATE ?? "0.62");
    const successRate = Number.isFinite(rate) ? Math.min(1, Math.max(0, rate)) : 0.62;
    const roll = Math.random();

    if (roll < successRate) {
      const remotePostId = `mock_${Date.now()}_${ctx.targetChannelId.slice(0, 6)}`;
      return {
        success: true,
        remotePostId,
        raw: {
          mode: "mock",
          textLength: payload.text.length,
          mediaCount: payload.mediaUrls.length,
          targetChannelId: ctx.targetChannelId,
        },
      };
    }

    const scenario = ERROR_SCENARIOS[Math.floor(Math.random() * ERROR_SCENARIOS.length)]!;
    return {
      success: false,
      errorCode: scenario.code,
      errorMessage: scenario.message,
      userMessage: getFacebookPublishUserMessage(scenario.code),
      raw: {
        mode: "mock",
        simulated: true,
        textLength: payload.text.length,
        mediaCount: payload.mediaUrls.length,
      },
    };
  }
}
