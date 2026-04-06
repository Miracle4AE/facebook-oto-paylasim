import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { ScheduleManager } from "@/components/schedule/schedule-manager";

export default async function SchedulePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const [contents, targets, slots] = await Promise.all([
    prisma.contentPost.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.targetChannel.findMany({
      where: { userId: session.user.id, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.scheduleSlot.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: { contentPost: true },
    }),
  ]);

  return (
    <ScheduleManager
      contents={contents.map((c) => ({
        id: c.id,
        title: c.title,
        body: c.body,
        status: c.status,
      }))}
      targets={targets.map((t) => ({ id: t.id, name: t.name }))}
      slots={slots.map((s) => ({
        id: s.id,
        contentPostId: s.contentPostId,
        contentTitle: s.contentPost.title,
        timezone: s.timezone,
        recurrence: s.recurrence,
        timesOfDay: s.timesOfDay,
        daysOfWeek: s.daysOfWeek,
        targetChannelIds: s.targetChannelIds,
        isActive: s.isActive,
      }))}
    />
  );
}
