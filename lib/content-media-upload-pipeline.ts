import { uploadMediaFileClient } from "@/lib/content-upload-client";
import type { UploadMediaPayload } from "@/lib/content-upload-client";
import { withRetry } from "@/lib/retry";
import type { MediaRecordInput } from "@/services/content/content-media.types";

const RETRY: { maxAttempts: number; baseDelayMs: number } = {
  maxAttempts: 3,
  baseDelayMs: 400,
};

export type MediaUploadFailure = {
  fileName: string;
  message: string;
  attempts: number;
};

export type MediaUploadPipelineResult = {
  success: UploadMediaPayload[];
  failures: MediaUploadFailure[];
  remainingImages: File[];
  remainingVideos: File[];
};

function toFailureMessage(error: Error, attempts: number): string {
  return `${error.message} (${attempts} deneme sonrası)`;
}

/** Sunucu action / Zod `mediaRecordSchema` ile uyumlu kayıt listesi. */
export function toMediaRecordInputs(payloads: UploadMediaPayload[]): MediaRecordInput[] {
  return payloads.map((p) => ({
    storageKey: p.storageKey,
    publicUrl: p.publicUrl,
    mimeType: p.mimeType,
    kind: p.kind === "VIDEO" ? "VIDEO" : "IMAGE",
    sizeBytes: p.sizeBytes,
  }));
}

export async function uploadPendingMediaWithRetry(
  images: File[],
  videos: File[],
): Promise<MediaUploadPipelineResult> {
  const success: UploadMediaPayload[] = [];
  const failures: MediaUploadFailure[] = [];
  const remainingImages: File[] = [];
  const remainingVideos: File[] = [];

  for (const file of images) {
    try {
      const payload = await withRetry(() => uploadMediaFileClient(file, "IMAGE"), RETRY);
      success.push(payload);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      failures.push({
        fileName: file.name,
        message: toFailureMessage(err, RETRY.maxAttempts),
        attempts: RETRY.maxAttempts,
      });
      remainingImages.push(file);
    }
  }

  for (const file of videos) {
    try {
      const payload = await withRetry(() => uploadMediaFileClient(file, "VIDEO"), RETRY);
      success.push(payload);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      failures.push({
        fileName: file.name,
        message: toFailureMessage(err, RETRY.maxAttempts),
        attempts: RETRY.maxAttempts,
      });
      remainingVideos.push(file);
    }
  }

  return { success, failures, remainingImages, remainingVideos };
}
