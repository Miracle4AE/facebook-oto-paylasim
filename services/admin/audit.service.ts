import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export const AdminAuditAction = {
  USER_CREATE: "USER_CREATE",
  USER_UPDATE: "USER_UPDATE",
  USER_ACTIVATE: "USER_ACTIVATE",
  USER_DEACTIVATE: "USER_DEACTIVATE",
  USER_ARCHIVE: "USER_ARCHIVE",
  USER_TEMP_PASSWORD: "USER_TEMP_PASSWORD",
  USER_FORCE_PASSWORD_CHANGE: "USER_FORCE_PASSWORD_CHANGE",
  SUBSCRIPTION_UPDATE: "SUBSCRIPTION_UPDATE",
  SUBSCRIPTION_EXTEND: "SUBSCRIPTION_EXTEND",
  PLAN_UPDATE: "PLAN_UPDATE",
  PAYMENT_CREATE: "PAYMENT_CREATE",
  PAYMENT_UPDATE: "PAYMENT_UPDATE",
  SETTINGS_UPDATE: "SETTINGS_UPDATE",
  DEMO_DATA_CLEAR_REQUEST: "DEMO_DATA_CLEAR_REQUEST",
} as const;

export const AdminEntityType = {
  USER: "USER",
  SUBSCRIPTION: "SUBSCRIPTION",
  PLAN: "PLAN",
  PAYMENT: "PAYMENT",
  SETTINGS: "SYSTEM_SETTINGS",
} as const;

export async function writeAdminAuditLog(input: {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipHash?: string | null;
}): Promise<void> {
  await db.adminAuditLog.create({
    data: {
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? undefined,
      ipHash: input.ipHash ?? null,
    },
  });
}
