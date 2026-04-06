"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { targetChannelSchema } from "@/lib/validations";
import { encryptSecret } from "@/lib/crypto/token-vault";

export async function createTargetChannel(input: unknown) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Oturum bulunamadı" };
  const parsed = targetChannelSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Geçersiz veri" };
  const data = parsed.data;
  await prisma.targetChannel.create({
    data: {
      userId: user.id,
      name: data.name,
      url: data.url,
      channelType: data.channelType,
      pageId: data.pageId || null,
      externalId: data.externalId || null,
      notes: data.notes || null,
      isActive: data.isActive,
      facebookAccountId: data.facebookAccountId || null,
      pageAccessTokenEnc: data.pageAccessToken?.trim()
        ? encryptSecret(data.pageAccessToken.trim())
        : null,
    } as Prisma.TargetChannelUncheckedCreateInput,
  });
  revalidatePath("/hedefler");
  return { ok: true as const };
}

export async function updateTargetChannel(id: string, input: unknown) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Oturum bulunamadı" };
  const parsed = targetChannelSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Geçersiz veri" };
  const data = parsed.data;
  const existing = await prisma.targetChannel.findFirst({ where: { id, userId: user.id } });
  if (!existing) return { ok: false as const, error: "Kayıt bulunamadı" };
  await prisma.targetChannel.update({
    where: { id },
    data: {
      name: data.name,
      url: data.url,
      channelType: data.channelType,
      pageId: data.pageId || null,
      externalId: data.externalId || null,
      notes: data.notes || null,
      isActive: data.isActive,
      facebookAccountId: data.facebookAccountId || null,
      ...(data.pageAccessToken !== undefined
        ? {
            pageAccessTokenEnc: data.pageAccessToken.trim()
              ? encryptSecret(data.pageAccessToken.trim())
              : null,
          }
        : {}),
    },
  });
  revalidatePath("/hedefler");
  return { ok: true as const };
}

export async function deleteTargetChannel(id: string) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Oturum bulunamadı" };
  const existing = await prisma.targetChannel.findFirst({ where: { id, userId: user.id } });
  if (!existing) return { ok: false as const, error: "Kayıt bulunamadı" };
  await prisma.targetChannel.delete({ where: { id } });
  revalidatePath("/hedefler");
  return { ok: true as const };
}
