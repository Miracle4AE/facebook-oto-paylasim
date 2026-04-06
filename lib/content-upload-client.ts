import type { StoredMedia } from "@/services/media/media.service";

export type UploadMediaPayload = {
  storageKey: string;
  publicUrl: string;
  mimeType: string;
  kind: string;
  sizeBytes: number;
};

export async function uploadMediaFileClient(file: File, kind: "IMAGE" | "VIDEO"): Promise<UploadMediaPayload> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("kind", kind);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const data = (await res.json()) as { ok: boolean; media?: StoredMedia };
  if (!res.ok || !data.ok || !data.media) {
    throw new Error("Dosya yüklenemedi. Boyut veya ağ bağlantısını kontrol edin.");
  }
  return data.media;
}
