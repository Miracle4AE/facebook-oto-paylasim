"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma, prismaFacebookOAuth } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { encryptSecret, decryptSecret } from "@/lib/crypto/token-vault";
import { appLogger } from "@/services/logging/app-logger";

type PagePayload = {
  pages: Array<{ id: string; name: string; access_token: string }>;
};

export async function completeFacebookPageConnection(stateId: string, pageId: string) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Oturum bulunamadı" };

  const state = await prismaFacebookOAuth.findFirst({
    where: { id: stateId, userId: user.id, expiresAt: { gt: new Date() } },
  });
  if (!state) {
    return { ok: false as const, error: "Oturum süresi doldu veya kayıt bulunamadı. Bağlantıyı yeniden başlatın." };
  }

  let payload: PagePayload;
  try {
    payload = JSON.parse(decryptSecret(state.payloadEnc)) as PagePayload;
  } catch {
    return { ok: false as const, error: "OAuth verisi okunamadı." };
  }

  const page = payload.pages.find((p) => p.id === pageId);
  if (!page) {
    return { ok: false as const, error: "Seçilen sayfa listede yok." };
  }

  await prisma.facebookAccount.create({
    data: {
      userId: user.id,
      label: page.name,
      accessTokenEnc: encryptSecret(page.access_token),
      pageId: page.id,
      externalId: page.id,
      isActive: true,
    } as unknown as Prisma.FacebookAccountUncheckedCreateInput,
  });

  await prismaFacebookOAuth.delete({ where: { id: stateId } });
  appLogger.info("facebook.oauth.page_connected", { userId: user.id, pageId: page.id });
  revalidatePath("/entegrasyon");
  revalidatePath("/hedefler");
  return { ok: true as const };
}

export async function discardFacebookOAuthState(stateId: string) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Oturum bulunamadı" };
  await prismaFacebookOAuth.deleteMany({
    where: { id: stateId, userId: user.id },
  });
  revalidatePath("/entegrasyon");
  return { ok: true as const };
}
