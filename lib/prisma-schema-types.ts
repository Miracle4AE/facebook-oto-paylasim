/**
 * prisma/schema.prisma ile uyumlu satır tipleri.
 * PrismaClient üretim tipleri IDE önbelleğinde geciktiğinde güvenli daraltma için kullanılır.
 */
export type FacebookAccountRow = {
  id: string;
  userId: string;
  label: string;
  accessTokenEnc: string | null;
  accessToken: string | null;
  appId: string | null;
  appSecretEnc: string | null;
  pageId: string | null;
  externalId: string | null;
  isActive: boolean;
  notes: string | null;
  tokenExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TargetChannelRow = {
  id: string;
  userId: string;
  facebookAccountId: string | null;
  name: string;
  url: string;
  channelType: string;
  externalId: string | null;
  pageId: string | null;
  pageAccessTokenEnc: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};
