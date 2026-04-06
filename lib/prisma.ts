import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

type FacebookOAuthStateRow = {
  id: string;
  payloadEnc: string;
  expiresAt: Date;
};

type OAuthDelegate = {
  findFirst: (args: unknown) => Promise<FacebookOAuthStateRow | null>;
  delete: (args: unknown) => Promise<unknown>;
  deleteMany: (args: unknown) => Promise<unknown>;
  create: (args: unknown) => Promise<{ id: string }>;
  update: (args: unknown) => Promise<unknown>;
};

/**
 * FacebookOAuthState Prisma delegate (prisma/schema.prisma).
 * Üretilmiş PrismaClient tipleri IDE’de gecikirse `prisma.facebookOAuthState` hata verebilir.
 */
export const prismaFacebookOAuth = (prisma as unknown as { facebookOAuthState: OAuthDelegate }).facebookOAuthState;
