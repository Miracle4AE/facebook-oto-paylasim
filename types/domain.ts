export const TargetChannelType = {
  PAGE: "PAGE",
  GROUP: "GROUP",
  PROFILE: "PROFILE",
  OTHER: "OTHER",
} as const;
export type TargetChannelType = (typeof TargetChannelType)[keyof typeof TargetChannelType];

export const ContentPostStatus = {
  DRAFT: "DRAFT",
  SCHEDULED: "SCHEDULED",
  PUBLISHED: "PUBLISHED",
  FAILED: "FAILED",
} as const;
export type ContentPostStatus = (typeof ContentPostStatus)[keyof typeof ContentPostStatus];

export const MediaKind = {
  IMAGE: "IMAGE",
  VIDEO: "VIDEO",
} as const;
export type MediaKind = (typeof MediaKind)[keyof typeof MediaKind];

export const ScheduleRecurrence = {
  ONCE: "ONCE",
  DAILY: "DAILY",
  WEEKLY: "WEEKLY",
} as const;
export type ScheduleRecurrence = (typeof ScheduleRecurrence)[keyof typeof ScheduleRecurrence];

export const PublishJobStatus = {
  PENDING: "PENDING",
  /** İşlem devam ediyor (kilitleme / eşzamanlılık kontrolü) */
  PROCESSING: "PROCESSING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  RETRY_SCHEDULED: "RETRY_SCHEDULED",
  CANCELLED: "CANCELLED",
} as const;
export type PublishJobStatus = (typeof PublishJobStatus)[keyof typeof PublishJobStatus];

export const PublishLogStatus = {
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  SKIPPED: "SKIPPED",
} as const;
export type PublishLogStatus = (typeof PublishLogStatus)[keyof typeof PublishLogStatus];
