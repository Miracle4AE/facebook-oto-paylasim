import { mkdir, writeFile, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import type { MediaKind } from "@/types/domain";

export type StoredMedia = {
  storageKey: string;
  publicUrl: string;
  mimeType: string;
  sizeBytes: number;
  kind: MediaKind;
};

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

export async function saveUploadedFile(
  file: File,
  kind: MediaKind,
): Promise<StoredMedia> {
  await mkdir(UPLOAD_ROOT, { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name) || (kind === "VIDEO" ? ".mp4" : ".bin");
  const safeName = `${Date.now()}_${randomBytes(6).toString("hex")}${ext}`;
  const storageKey = path.join("uploads", safeName).replace(/\\/g, "/");
  const diskPath = path.join(UPLOAD_ROOT, safeName);
  await writeFile(diskPath, buf);
  const mimeType = file.type || "application/octet-stream";
  return {
    storageKey,
    publicUrl: `/${storageKey}`,
    mimeType,
    sizeBytes: buf.length,
    kind,
  };
}

export function getStorageDriver(): "local" | "s3" {
  return process.env.MEDIA_STORAGE_DRIVER === "s3" ? "s3" : "local";
}

export async function deleteStoredMediaFile(storageKey: string): Promise<void> {
  if (getStorageDriver() !== "local") {
    return;
  }
  if (!storageKey.startsWith("uploads/")) {
    return;
  }
  const absolute = path.join(process.cwd(), "public", ...storageKey.split("/"));
  const normalized = path.normalize(absolute);
  const publicRoot = path.normalize(path.join(process.cwd(), "public"));
  if (!normalized.toLowerCase().startsWith(publicRoot.toLowerCase())) {
    return;
  }
  if (existsSync(normalized)) {
    await unlink(normalized);
  }
}
