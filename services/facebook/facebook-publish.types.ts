import type { TargetChannelType } from "@/types/domain";

export type FacebookPublishPayload = {
  text: string;
  mediaUrls: string[];
  mediaKinds: ("IMAGE" | "VIDEO")[];
};

export type FacebookPublishContext = {
  accessToken: string;
  pageId?: string | null;
  targetChannelId: string;
  targetType: TargetChannelType;
  externalId?: string | null;
};

export type FacebookPublishTelemetry = {
  endpoint: string;
  method: "GET" | "POST";
  httpStatus: number;
  graphErrorCode?: number;
  graphErrorSubcode?: number;
  fbtraceId?: string;
  durationMs?: number;
};

export type FacebookPublishResult = {
  success: boolean;
  remotePostId?: string;
  errorCode?: string;
  /** Teknik / log (PublishLog yapılandırılmış payload içinde saklanır) */
  errorMessage?: string;
  /** Son kullanıcıya gösterilecek Türkçe özet */
  userMessage?: string;
  raw?: Record<string, unknown>;
  telemetry?: FacebookPublishTelemetry;
};
