"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { scheduleSlotSchema } from "@/lib/validations";
import { ContentPostStatus } from "@/types/domain";

export async function upsertScheduleSlot(id: string | undefined, input: unknown) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Oturum bulunamadı" };
  const parsed = scheduleSlotSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Geçersiz veri" };
  const data = parsed.data;

  const post = await prisma.contentPost.findFirst({
    where: { id: data.contentPostId, userId: user.id },
  });
  if (!post) return { ok: false as const, error: "İçerik bulunamadı" };

  const payload = {
    userId: user.id,
    contentPostId: data.contentPostId,
    timezone: data.timezone,
    recurrence: data.recurrence,
    scheduledAt: data.scheduledAt ?? null,
    timesOfDay: JSON.stringify(data.timesOfDay),
    daysOfWeek: data.daysOfWeek ? JSON.stringify(data.daysOfWeek) : null,
    targetChannelIds: JSON.stringify(data.targetChannelIds),
    isActive: data.isActive,
  };

  if (id) {
    const slot = await prisma.scheduleSlot.findFirst({ where: { id, userId: user.id } });
    if (!slot) return { ok: false as const, error: "Zamanlama bulunamadı" };
    await prisma.scheduleSlot.update({ where: { id }, data: payload });
  } else {
    await prisma.scheduleSlot.create({ data: payload });
  }

  await prisma.contentPost.update({
    where: { id: data.contentPostId },
    data: { status: ContentPostStatus.SCHEDULED },
  });

  revalidatePath("/zamanlama");
  revalidatePath("/icerikler");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function deleteScheduleSlot(id: string) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Oturum bulunamadı" };
  const slot = await prisma.scheduleSlot.findFirst({ where: { id, userId: user.id } });
  if (!slot) return { ok: false as const, error: "Kayıt bulunamadı" };
  await prisma.scheduleSlot.delete({ where: { id } });
  revalidatePath("/zamanlama");
  return { ok: true as const };
}
