import { prisma } from "@/lib/prisma";
import type { GroupTargetSummary } from "@/types/group-target";
import { TargetChannelType } from "@/types/domain";

export type { GroupTargetSummary };

/**
 * Yarı otomatik grup paylaşımı için: kullanıcıya ait aktif GROUP hedefleri.
 * Otomatik Graph gönderimi yapılmaz; yalnızca UI yardımcılarında kullanılır.
 */
export async function getActiveGroupTargetsForUser(userId: string): Promise<GroupTargetSummary[]> {
  const rows = await prisma.targetChannel.findMany({
    where: {
      userId,
      channelType: TargetChannelType.GROUP,
      isActive: true,
    },
    orderBy: [{ name: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      name: true,
      url: true,
      notes: true,
    },
  });
  return rows;
}
