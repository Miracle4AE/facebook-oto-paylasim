"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { appLogger } from "@/services/logging/app-logger";
import { ContentPostStatus } from "@/types/domain";

const quickSchema = z.object({
  title: z.string().max(200).optional().nullable(),
  body: z.string().min(1, "Metin gerekli").max(20_000),
});

export async function createActivationQuickStartContent(input: unknown) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Oturum bulunamadı" };
  const parsed = quickSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Geçersiz veri" };

  const title = parsed.data.title?.trim() ?? "";
  const body = parsed.data.body.trim();

  try {
    const post = await prisma.contentPost.create({
      data: {
        userId: user.id,
        title: title.length > 0 ? title : null,
        body,
        status: ContentPostStatus.DRAFT,
      },
    });
    appLogger.info("content.activation_quickstart", { userId: user.id, postId: post.id });
    revalidatePath("/dashboard");
    revalidatePath("/icerikler");
    revalidatePath(`/icerikler/${post.id}`);
    return { ok: true as const, id: post.id };
  } catch (e) {
    appLogger.error(
      "content.activation_quickstart_failed",
      { userId: user.id },
      e instanceof Error ? e : new Error(String(e)),
    );
    return { ok: false as const, error: "İçerik oluşturulamadı." };
  }
}
