import { prisma } from "@/lib/prisma";
import { deleteStoredMediaFile } from "@/services/media/media.service";
import { appLogger } from "@/services/logging/app-logger";
import type { MediaRecordInput } from "@/services/content/content-media.types";

function dedupeMediaByStorageKey(items: MediaRecordInput[]): MediaRecordInput[] {
  const map = new Map<string, MediaRecordInput>();
  for (const item of items) {
    map.set(item.storageKey, item);
  }
  return Array.from(map.values());
}

async function cleanupUploadedFiles(keys: string[]): Promise<void> {
  await Promise.all(
    keys.map(async (storageKey) => {
      try {
        await deleteStoredMediaFile(storageKey);
      } catch {
        appLogger.warn("content.media.cleanup_failed", { storageKey });
      }
    }),
  );
}

export async function commitContentUpdateWithMediaTx(params: {
  userId: string;
  postId: string;
  title: string | null;
  body: string;
  status: string;
  newMedia: MediaRecordInput[];
}): Promise<void> {
  const deduped = dedupeMediaByStorageKey(params.newMedia);
  appLogger.info("content.commit.update.begin", {
    userId: params.userId,
    postId: params.postId,
    mediaCount: String(deduped.length),
  });
  try {
    await prisma.$transaction(async (tx) => {
      const post = await tx.contentPost.findFirst({
        where: { id: params.postId, userId: params.userId },
      });
      if (!post) {
        const err = new Error("CONTENT_NOT_FOUND");
        err.name = "ContentNotFoundError";
        throw err;
      }
      await tx.contentPost.update({
        where: { id: params.postId },
        data: {
          title: params.title,
          body: params.body,
          status: params.status,
        },
      });
      for (const m of deduped) {
        await tx.mediaFile.create({
          data: {
            contentPostId: params.postId,
            storageKey: m.storageKey,
            publicUrl: m.publicUrl,
            mimeType: m.mimeType,
            kind: m.kind,
            sizeBytes: m.sizeBytes,
          },
        });
      }
    });
    appLogger.info("content.commit.update.done", {
      userId: params.userId,
      postId: params.postId,
      mediaCount: String(deduped.length),
    });
  } catch (e) {
    await cleanupUploadedFiles(deduped.map((m) => m.storageKey));
    appLogger.error(
      "content.commit.update.failed",
      {
        userId: params.userId,
        postId: params.postId,
        mediaCount: String(deduped.length),
      },
      e instanceof Error ? e : new Error(String(e)),
    );
    throw e;
  }
}

export async function createContentWithMediaTx(params: {
  userId: string;
  title: string | null;
  body: string;
  status: string;
  newMedia: MediaRecordInput[];
}): Promise<string> {
  const deduped = dedupeMediaByStorageKey(params.newMedia);
  appLogger.info("content.commit.create.begin", {
    userId: params.userId,
    mediaCount: String(deduped.length),
  });
  try {
    const postId = await prisma.$transaction(async (tx) => {
      const post = await tx.contentPost.create({
        data: {
          userId: params.userId,
          title: params.title,
          body: params.body,
          status: params.status,
        },
      });
      for (const m of deduped) {
        await tx.mediaFile.create({
          data: {
            contentPostId: post.id,
            storageKey: m.storageKey,
            publicUrl: m.publicUrl,
            mimeType: m.mimeType,
            kind: m.kind,
            sizeBytes: m.sizeBytes,
          },
        });
      }
      return post.id;
    });
    appLogger.info("content.commit.create.done", {
      userId: params.userId,
      postId,
      mediaCount: String(deduped.length),
    });
    return postId;
  } catch (e) {
    await cleanupUploadedFiles(deduped.map((m) => m.storageKey));
    appLogger.error(
      "content.commit.create.failed",
      {
        userId: params.userId,
        mediaCount: String(deduped.length),
      },
      e instanceof Error ? e : new Error(String(e)),
    );
    throw e;
  }
}
