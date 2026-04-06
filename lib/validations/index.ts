import { z } from "zod";

const channelTypeEnum = z.enum(["PAGE", "GROUP", "PROFILE", "OTHER"]);
const contentStatusEnum = z.enum(["DRAFT", "SCHEDULED", "PUBLISHED", "FAILED"]);
const scheduleRecurrenceEnum = z.enum(["ONCE", "DAILY", "WEEKLY"]);

export const loginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta girin"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
});

export const targetChannelSchema = z.object({
  name: z.string().min(1, "İsim gerekli"),
  url: z.string().url("Geçerli bir URL girin"),
  channelType: channelTypeEnum,
  pageId: z.string().optional(),
  externalId: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean(),
  facebookAccountId: z.string().optional().nullable(),
  /** Sayfa özel token; sunucuda şifrelenir */
  pageAccessToken: z.string().optional(),
});

export const contentPostSchema = z.object({
  title: z.string().optional(),
  body: z.string().min(1, "Paylaşım metni gerekli"),
  status: contentStatusEnum,
});

export const mediaRecordSchema = z.object({
  storageKey: z.string().min(1),
  publicUrl: z.string().min(1),
  mimeType: z.string().min(1),
  kind: z.enum(["IMAGE", "VIDEO"]),
  sizeBytes: z.number().int().nonnegative(),
});

export const mediaRecordArraySchema = z.array(mediaRecordSchema);

export const scheduleSlotSchema = z.object({
  contentPostId: z.string().min(1),
  timezone: z.string().min(1),
  recurrence: scheduleRecurrenceEnum,
  scheduledAt: z.date().nullable().optional(),
  timesOfDay: z.array(z.string().regex(/^\d{2}:\d{2}$/, "SS:dd formatında olmalı")),
  daysOfWeek: z.array(z.number().min(1).max(7)).optional(),
  targetChannelIds: z.array(z.string()).min(1, "En az bir hedef seçin"),
  isActive: z.boolean(),
});

export const facebookAccountBaseSchema = z.object({
  label: z.string().min(1, "Etiket gerekli"),
  accessToken: z.string().optional(),
  pageId: z.string().optional(),
  externalId: z.string().optional(),
  appId: z.string().optional(),
  appSecret: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean(),
});

export const facebookAccountSchema = facebookAccountBaseSchema.extend({
  accessToken: z.string().min(1, "Erişim anahtarı gerekli"),
});

export const appSettingsSchema = z.object({
  name: z.string().optional(),
  defaultTimezone: z.string().min(1),
  notifyEmail: z.boolean(),
  notifyInApp: z.boolean(),
  notifyPublishResult: z.boolean(),
});
