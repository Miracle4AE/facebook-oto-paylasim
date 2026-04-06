export const UserRole = {
  ADMIN: "ADMIN",
  USER: "USER",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/** Abonelik plan kodları — veritabanı SubscriptionPlan.code ile uyumlu */
export const SubscriptionPlanCode = {
  TRIAL: "TRIAL",
  BASIC: "BASIC",
  PRO: "PRO",
  PREMIUM: "PREMIUM",
  CUSTOM: "CUSTOM",
} as const;
export type SubscriptionPlanCode = (typeof SubscriptionPlanCode)[keyof typeof SubscriptionPlanCode];

export const PaymentRecordStatus = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
} as const;

export const ManualPaymentMethod = {
  MANUAL: "MANUAL",
  STRIPE: "STRIPE",
  IYZICO: "IYZICO",
  OTHER: "OTHER",
} as const;

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
