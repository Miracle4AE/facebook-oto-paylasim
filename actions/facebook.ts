"use server";

import type { z } from "zod";
import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { facebookAccountBaseSchema, facebookAccountSchema } from "@/lib/validations";
import { encryptSecret } from "@/lib/crypto/token-vault";
import type { FacebookAccountRow } from "@/lib/prisma-schema-types";

type FacebookCreateInput = z.infer<typeof facebookAccountSchema>;

function encOptional(plain: string | undefined | null): string | null {
  const t = plain?.trim();
  if (!t) return null;
  return encryptSecret(t);
}

export async function upsertFacebookAccount(id: string | undefined, input: unknown) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Oturum bulunamadı" };

  const parsed = id ? facebookAccountBaseSchema.safeParse(input) : facebookAccountSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Geçersiz veri" };
  const data = parsed.data;

  if (id) {
    const acc = (await prisma.facebookAccount.findFirst({
      where: { id, userId: user.id },
    })) as unknown as FacebookAccountRow | null;
    if (!acc) return { ok: false as const, error: "Kayıt bulunamadı" };
    const hasNewToken = Boolean(data.accessToken?.trim());
    const accessTokenEnc = hasNewToken
      ? encryptSecret(data.accessToken!.trim())
      : acc.accessTokenEnc;
    const accessTokenLegacy = hasNewToken ? null : acc.accessToken;
    const appSecretEnc = data.appSecret?.trim() ? encryptSecret(data.appSecret.trim()) : acc.appSecretEnc;
    await prisma.facebookAccount.update({
      where: { id },
      data: {
        label: data.label,
        accessTokenEnc,
        accessToken: accessTokenLegacy,
        pageId: data.pageId || null,
        externalId: data.externalId || null,
        appId: data.appId || null,
        appSecretEnc,
        notes: data.notes || null,
        isActive: data.isActive,
      } as Prisma.FacebookAccountUncheckedUpdateInput,
    });
  } else {
    const d = data as FacebookCreateInput;
    await prisma.facebookAccount.create({
      data: {
        userId: user.id,
        label: d.label,
        accessTokenEnc: encryptSecret(d.accessToken.trim()),
        pageId: d.pageId || null,
        externalId: d.externalId || null,
        appId: d.appId || null,
        appSecretEnc: encOptional(d.appSecret),
        notes: d.notes || null,
        isActive: d.isActive,
      } as unknown as Prisma.FacebookAccountUncheckedCreateInput,
    });
  }
  revalidatePath("/entegrasyon");
  revalidatePath("/ayarlar");
  return { ok: true as const };
}

export async function deleteFacebookAccount(id: string) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Oturum bulunamadı" };
  const acc = await prisma.facebookAccount.findFirst({ where: { id, userId: user.id } });
  if (!acc) return { ok: false as const, error: "Kayıt bulunamadı" };
  await prisma.facebookAccount.delete({ where: { id } });
  revalidatePath("/entegrasyon");
  return { ok: true as const };
}
