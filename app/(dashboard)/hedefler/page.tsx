import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { TargetsView } from "@/components/targets/targets-view";

export default async function TargetsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const [targets, facebookAccounts] = await Promise.all([
    prisma.targetChannel.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.facebookAccount.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      select: { id: true, label: true },
    }),
  ]);

  return (
    <TargetsView
      initialTargets={targets.map((t) => ({
        id: t.id,
        name: t.name,
        url: t.url,
        channelType: t.channelType,
        isActive: t.isActive,
        notes: t.notes,
        pageId: t.pageId,
        externalId: t.externalId,
        facebookAccountId: t.facebookAccountId,
      }))}
      facebookAccounts={facebookAccounts}
    />
  );
}
