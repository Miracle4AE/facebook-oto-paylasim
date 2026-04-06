import { prisma } from "@/lib/prisma";

/** Bazı IDE ortamlarında güncel şema yansımayınca `systemSettings` delegate’i eksik görünebilir. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

const SINGLETON_ID = "singleton";

export type SystemSettingsDTO = {
  id: string;
  defaultAppName: string;
  supportEmail: string | null;
  defaultTimezone: string;
  publishRetryMax: number;
  logRetentionDays: number;
  maintenanceMode: boolean;
  facebookModeNote: string;
};

export async function getSystemSettings(): Promise<SystemSettingsDTO> {
  const row = await db.systemSettings.findUnique({ where: { id: SINGLETON_ID } });
  if (row) {
    return {
      id: row.id,
      defaultAppName: row.defaultAppName,
      supportEmail: row.supportEmail,
      defaultTimezone: row.defaultTimezone,
      publishRetryMax: row.publishRetryMax,
      logRetentionDays: row.logRetentionDays,
      maintenanceMode: row.maintenanceMode,
      facebookModeNote: row.facebookModeNote,
    };
  }
  return db.systemSettings.create({
    data: { id: SINGLETON_ID },
  });
}

export async function updateSystemSettings(data: {
  defaultAppName?: string;
  supportEmail?: string | null;
  defaultTimezone?: string;
  publishRetryMax?: number;
  logRetentionDays?: number;
  maintenanceMode?: boolean;
  facebookModeNote?: string;
}): Promise<SystemSettingsDTO> {
  await getSystemSettings();
  const updated = await db.systemSettings.update({
    where: { id: SINGLETON_ID },
    data: {
      ...(data.defaultAppName !== undefined ? { defaultAppName: data.defaultAppName } : {}),
      ...(data.supportEmail !== undefined ? { supportEmail: data.supportEmail } : {}),
      ...(data.defaultTimezone !== undefined ? { defaultTimezone: data.defaultTimezone } : {}),
      ...(data.publishRetryMax !== undefined ? { publishRetryMax: data.publishRetryMax } : {}),
      ...(data.logRetentionDays !== undefined ? { logRetentionDays: data.logRetentionDays } : {}),
      ...(data.maintenanceMode !== undefined ? { maintenanceMode: data.maintenanceMode } : {}),
      ...(data.facebookModeNote !== undefined ? { facebookModeNote: data.facebookModeNote } : {}),
    },
  });
  return {
    id: updated.id,
    defaultAppName: updated.defaultAppName,
    supportEmail: updated.supportEmail,
    defaultTimezone: updated.defaultTimezone,
    publishRetryMax: updated.publishRetryMax,
    logRetentionDays: updated.logRetentionDays,
    maintenanceMode: updated.maintenanceMode,
    facebookModeNote: updated.facebookModeNote,
  };
}
