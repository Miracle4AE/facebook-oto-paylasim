import type { IFacebookPublishService } from "./facebook-publish.service";
import type { FacebookPublishContext, FacebookPublishPayload, FacebookPublishResult } from "./facebook-publish.types";
import { mapGraphHttpToPublishResult } from "./facebook-graph-errors";
import { graphApiPost } from "./facebook-graph-http";
import { getFacebookPublishUserMessage } from "./facebook-user-messages";
import { TargetChannelType } from "@/types/domain";

function networkFailure(e: unknown): FacebookPublishResult {
  const msg = e instanceof Error ? e.message : "Ağ hatası";
  return {
    success: false,
    errorCode: "NETWORK",
    errorMessage: msg,
    userMessage: getFacebookPublishUserMessage("NETWORK"),
  };
}

export class FacebookGraphPublishService implements IFacebookPublishService {
  async publish(
    ctx: FacebookPublishContext,
    payload: FacebookPublishPayload,
  ): Promise<FacebookPublishResult> {
    if (ctx.targetType === TargetChannelType.GROUP) {
      return {
        success: false,
        errorCode: "UNSUPPORTED_TARGET",
        errorMessage:
          "Grup hedefleri için Meta ayrı uç noktalar ve izinler gerektirir; bu panel şu an yalnızca Facebook Sayfa paylaşımını destekler.",
        userMessage: getFacebookPublishUserMessage("UNSUPPORTED_TARGET"),
      };
    }

    if (ctx.targetType === TargetChannelType.PROFILE) {
      return {
        success: false,
        errorCode: "UNSUPPORTED_TARGET",
        errorMessage:
          "Kişisel profil zaman tüneli gönderimi bu entegrasyon kapsamında desteklenmiyor; bir Facebook Sayfası seçin.",
        userMessage: getFacebookPublishUserMessage("UNSUPPORTED_TARGET"),
      };
    }

    const pageId = ctx.pageId ?? ctx.externalId;
    if (!pageId) {
      return {
        success: false,
        errorCode: "MISSING_PAGE_ID",
        errorMessage: "Sayfa kimliği (pageId) eksik. Hedef veya hesap ayarlarını kontrol edin.",
        userMessage: getFacebookPublishUserMessage("MISSING_PAGE_ID"),
      };
    }

    const token = ctx.accessToken;
    const text = payload.text ?? "";
    const urls = payload.mediaUrls;
    const kinds = payload.mediaKinds;

    const hasVideo = kinds.some((k) => k === "VIDEO");
    const hasImage = kinds.some((k) => k === "IMAGE");

    try {
      if (urls.length === 0) {
        return await postFeedMessage(pageId, token, text);
      }

      if (hasVideo) {
        const vIdx = kinds.findIndex((k) => k === "VIDEO");
        const videoUrl = urls[vIdx]!;
        const restImages = urls.filter((_, i) => i !== vIdx && kinds[i] === "IMAGE");
        const videoRes = await postPageVideo(pageId, token, videoUrl, text);
        if (!videoRes.success) return videoRes;
        if (restImages.length > 0) {
          return {
            ...videoRes,
            raw: {
              ...(videoRes.raw ?? {}),
              note: `${restImages.length} ek görsel aynı gönderide desteklenmedi; yalnızca video yayınlandı.`,
            },
          };
        }
        return videoRes;
      }

      if (hasImage) {
        const imageUrls = urls.filter((_, i) => kinds[i] === "IMAGE");
        if (imageUrls.length === 1) {
          return await postSinglePhoto(pageId, token, imageUrls[0]!, text);
        }
        return await postMultiImageFeed(pageId, token, imageUrls, text);
      }

      return await postFeedMessage(pageId, token, text);
    } catch (e) {
      return networkFailure(e);
    }
  }
}

async function postFeedMessage(pageId: string, token: string, message: string): Promise<FacebookPublishResult> {
  const endpoint = `/${pageId}/feed`;
  const body = new URLSearchParams({
    message,
    access_token: token,
  });
  const { ok, status, data, durationMs } = await graphApiPost(endpoint, body);
  if (!ok) {
    return mapGraphHttpToPublishResult(status, data, {
      endpoint,
      method: "POST",
      durationMs,
    });
  }
  const id = typeof data.id === "string" ? data.id : undefined;
  return {
    success: true,
    remotePostId: id,
    raw: data,
    telemetry: { endpoint, method: "POST", httpStatus: status, durationMs },
  };
}

async function postSinglePhoto(
  pageId: string,
  token: string,
  imageUrl: string,
  caption: string,
): Promise<FacebookPublishResult> {
  const endpoint = `/${pageId}/photos`;
  const body = new URLSearchParams({
    url: imageUrl,
    caption,
    published: "true",
    access_token: token,
  });
  const { ok, status, data, durationMs } = await graphApiPost(endpoint, body);
  if (!ok) {
    return mapGraphHttpToPublishResult(status, data, {
      endpoint,
      method: "POST",
      durationMs,
    });
  }
  const id = typeof data.id === "string" ? data.id : undefined;
  return {
    success: true,
    remotePostId: id,
    raw: data,
    telemetry: { endpoint, method: "POST", httpStatus: status, durationMs },
  };
}

async function postMultiImageFeed(
  pageId: string,
  token: string,
  imageUrls: string[],
  message: string,
): Promise<FacebookPublishResult> {
  const mediaFbids: string[] = [];
  for (const img of imageUrls) {
    const endpoint = `/${pageId}/photos`;
    const body = new URLSearchParams({
      url: img,
      published: "false",
      access_token: token,
    });
    const { ok, status, data, durationMs } = await graphApiPost(endpoint, body);
    if (!ok) {
      return mapGraphHttpToPublishResult(status, data, {
        endpoint,
        method: "POST",
        durationMs,
      });
    }
    const mid = typeof data.id === "string" ? data.id : undefined;
    if (!mid) {
      return {
        success: false,
        errorCode: "MEDIA_UPLOAD_FAILED",
        errorMessage: "Fotoğraf yüklemesinden media id alınamadı.",
        userMessage: getFacebookPublishUserMessage("MEDIA_UPLOAD_FAILED"),
        raw: data,
        telemetry: { endpoint, method: "POST", httpStatus: status, durationMs },
      };
    }
    mediaFbids.push(mid);
  }

  const feedEndpoint = `/${pageId}/feed`;
  const feedBody = new URLSearchParams({
    message,
    access_token: token,
  });
  feedBody.append(
    "attached_media",
    JSON.stringify(mediaFbids.map((id) => ({ media_fbid: id }))),
  );

  const { ok, status, data, durationMs } = await graphApiPost(feedEndpoint, feedBody);
  if (!ok) {
    return mapGraphHttpToPublishResult(status, data, {
      endpoint: feedEndpoint,
      method: "POST",
      durationMs,
    });
  }
  const id = typeof data.id === "string" ? data.id : undefined;
  return {
    success: true,
    remotePostId: id,
    raw: data,
    telemetry: { endpoint: feedEndpoint, method: "POST", httpStatus: status, durationMs },
  };
}

async function postPageVideo(
  pageId: string,
  token: string,
  fileUrl: string,
  description: string,
): Promise<FacebookPublishResult> {
  const endpoint = `/${pageId}/videos`;
  const body = new URLSearchParams({
    file_url: fileUrl,
    description,
    access_token: token,
  });
  const { ok, status, data, durationMs } = await graphApiPost(endpoint, body);
  if (!ok) {
    return mapGraphHttpToPublishResult(status, data, {
      endpoint,
      method: "POST",
      durationMs,
    });
  }
  const id = typeof data.id === "string" ? data.id : undefined;
  return {
    success: true,
    remotePostId: id,
    raw: data,
    telemetry: { endpoint, method: "POST", httpStatus: status, durationMs },
  };
}
