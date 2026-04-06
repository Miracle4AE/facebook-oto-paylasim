import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto/token-vault";
import type { FacebookAccountRow, TargetChannelRow } from "@/lib/prisma-schema-types";
import { getFacebookAccountPlainToken } from "@/services/facebook/facebook-account-token";
import { TargetChannelType } from "@/types/domain";
import type { FacebookPublishContext } from "./facebook-publish.types";

/**
 * Yayın için gerekli sayfa erişim anahtarını ve kimlikleri çözer (sunucu tarafı).
 */
export async function resolveFacebookPublishContext(
  targetChannelId: string,
  userId: string,
): Promise<FacebookPublishContext | null> {
  const channel = await prisma.targetChannel.findFirst({
    where: { id: targetChannelId, userId },
    include: { facebookAccount: true },
  });
  if (!channel) return null;

  const row = channel as typeof channel & TargetChannelRow;

  let accessToken: string | null = null;

  if (row.pageAccessTokenEnc?.trim()) {
    accessToken = decryptSecret(row.pageAccessTokenEnc);
  } else if (channel.facebookAccountId && channel.facebookAccount) {
    accessToken = getFacebookAccountPlainToken(channel.facebookAccount as unknown as FacebookAccountRow);
  } else {
    const fb = await prisma.facebookAccount.findFirst({
      where: { userId, isActive: true },
      orderBy: { updatedAt: "desc" },
    });
    if (fb) {
      accessToken = getFacebookAccountPlainToken(fb as unknown as FacebookAccountRow);
    }
  }

  if (!accessToken) {
    return null;
  }

  return {
    accessToken,
    pageId: channel.pageId ?? undefined,
    targetChannelId: channel.id,
    targetType: (channel.channelType as FacebookPublishContext["targetType"]) ?? TargetChannelType.OTHER,
    externalId: channel.externalId ?? undefined,
  };
}
