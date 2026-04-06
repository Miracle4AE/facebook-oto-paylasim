"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { appSettingsSchema } from "@/lib/validations";

export async function updateAppSettings(input: unknown) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Oturum bulunamadı" };
  const parsed = appSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Geçersiz veri" };
  const data = parsed.data;

  await prisma.user.update({
    where: { id: user.id },
    data: { name: data.name || null, timezone: data.defaultTimezone },
  });

  await prisma.appSetting.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      defaultTimezone: data.defaultTimezone,
      notifyEmail: data.notifyEmail,
      notifyInApp: data.notifyInApp,
      notifyPublishResult: data.notifyPublishResult,
    },
    update: {
      defaultTimezone: data.defaultTimezone,
      notifyEmail: data.notifyEmail,
      notifyInApp: data.notifyInApp,
      notifyPublishResult: data.notifyPublishResult,
    },
  });

  revalidatePath("/ayarlar");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
