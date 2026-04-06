import { prisma } from "@/lib/prisma";

export type ContentPostDetailMediaItem = {
  id: string;
  publicUrl: string;
  mimeType: string;
  kind: string;
  sizeBytes: number;
  createdAt: Date;
};

export type ContentPostDetailPublishJob = {
  id: string;
  status: string;
  scheduledFor: Date;
  nextRetryAt: Date | null;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  targetChannel: { name: string };
};

export type ContentPostDetail = {
  id: string;
  title: string | null;
  body: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  media: ContentPostDetailMediaItem[];
  publishJobs: ContentPostDetailPublishJob[];
};

/**
 * Yalnızca belirtilen kullanıcıya ait içeriği döndürür; aksi halde `null`.
 */
export async function getContentPostDetailForUser(params: {
  userId: string;
  postId: string;
}): Promise<ContentPostDetail | null> {
  const post = await prisma.contentPost.findFirst({
    where: { id: params.postId, userId: params.userId },
    include: {
      mediaFiles: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          publicUrl: true,
          mimeType: true,
          kind: true,
          sizeBytes: true,
          createdAt: true,
        },
      },
      publishJobs: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          status: true,
          scheduledFor: true,
          nextRetryAt: true,
          attempts: true,
          maxAttempts: true,
          lastError: true,
          targetChannel: { select: { name: true } },
        },
      },
    },
  });

  if (!post) return null;

  return {
    id: post.id,
    title: post.title,
    body: post.body,
    status: post.status,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    media: post.mediaFiles.map((m) => ({
      id: m.id,
      publicUrl: m.publicUrl,
      mimeType: m.mimeType,
      kind: m.kind,
      sizeBytes: m.sizeBytes,
      createdAt: m.createdAt,
    })),
    publishJobs: post.publishJobs.map((j) => ({
      id: j.id,
      status: j.status,
      scheduledFor: j.scheduledFor,
      nextRetryAt: j.nextRetryAt,
      attempts: j.attempts,
      maxAttempts: j.maxAttempts,
      lastError: j.lastError,
      targetChannel: j.targetChannel,
    })),
  };
}
