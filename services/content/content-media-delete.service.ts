import { prisma } from "@/lib/prisma";
import { deleteStoredMediaFile } from "@/services/media/media.service";
import { appLogger } from "@/services/logging/app-logger";

export async function deleteUserMediaFile(params: {
  userId: string;
  mediaId: string;
}): Promise<{ contentPostId: string }> {
  const media = await prisma.mediaFile.findUnique({
    where: { id: params.mediaId },
    include: { contentPost: true },
  });
  if (!media || media.contentPost.userId !== params.userId) {
    const err = new Error("MEDIA_NOT_FOUND");
    err.name = "MediaNotFoundError";
    throw err;
  }

  const contentPostId = media.contentPostId;

  await prisma.$transaction(async (tx) => {
    await tx.mediaFile.delete({ where: { id: params.mediaId } });
  });

  try {
    await deleteStoredMediaFile(media.storageKey);
  } catch (e) {
    appLogger.warn(
      "content.media.delete_disk_failed",
      {
        userId: params.userId,
        mediaId: params.mediaId,
        storageKey: media.storageKey,
        contentPostId,
      },
      e instanceof Error ? e : new Error(String(e)),
    );
  }

  return { contentPostId };
}
