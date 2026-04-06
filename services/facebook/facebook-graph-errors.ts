import type { FacebookPublishResult, FacebookPublishTelemetry } from "./facebook-publish.types";
import { getFacebookPublishUserMessage } from "./facebook-user-messages";

/** Graph API `error` nesnesi — https://developers.facebook.com/docs/graph-api/guides/error-handling/ */
export type ParsedGraphError = {
  message: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
  is_transient?: boolean;
};

type GraphErrorEnvelope = {
  error?: ParsedGraphError;
};

const RATE_LIMIT_CODES = new Set([4, 17, 32, 613, 80004, 80007]);
/** Yaygın kalıcı OAuth / izin kodları */
const TOKEN_CODES = new Set([102, 190, 458, 459, 460, 463, 467]);
const PERMISSION_CODES = new Set([10, 200, 294, 296, 299]);

export function parseGraphErrorBody(data: unknown): ParsedGraphError | null {
  if (!data || typeof data !== "object") return null;
  const err = (data as GraphErrorEnvelope).error;
  if (!err || typeof err !== "object") return null;
  const message = typeof err.message === "string" ? err.message : "Graph hatası";
  return {
    message,
    type: typeof err.type === "string" ? err.type : undefined,
    code: typeof err.code === "number" ? err.code : undefined,
    error_subcode: typeof err.error_subcode === "number" ? err.error_subcode : undefined,
    fbtrace_id: typeof err.fbtrace_id === "string" ? err.fbtrace_id : undefined,
    is_transient: err.is_transient === true,
  };
}

export function classifyGraphError(
  parsed: ParsedGraphError | null,
  httpStatus: number,
): { errorCode: string; technicalMessage: string } {
  const code = parsed?.code;
  const sub = parsed?.error_subcode;
  const msg = parsed?.message ?? `HTTP ${httpStatus}`;

  if (httpStatus === 429) {
    return { errorCode: "RATE_LIMIT", technicalMessage: msg };
  }
  if (httpStatus >= 500) {
    return { errorCode: "GRAPH_SERVER", technicalMessage: msg };
  }

  if (code === undefined) {
    if (httpStatus >= 400 && httpStatus < 500) {
      return { errorCode: "GRAPH_CLIENT", technicalMessage: msg };
    }
    return { errorCode: "GRAPH_ERROR", technicalMessage: msg };
  }

  if (TOKEN_CODES.has(code) || sub === 463 || sub === 467) {
    return { errorCode: "TOKEN_EXPIRED", technicalMessage: msg };
  }
  if (PERMISSION_CODES.has(code)) {
    return { errorCode: "PERMISSION_DENIED", technicalMessage: msg };
  }
  if (RATE_LIMIT_CODES.has(code) || parsed?.is_transient) {
    return { errorCode: "RATE_LIMIT", technicalMessage: msg };
  }
  if (code === 100 || code === 2500) {
    return { errorCode: "GRAPH_CLIENT", technicalMessage: msg };
  }
  if (code === 368) {
    return { errorCode: "RATE_LIMIT", technicalMessage: msg };
  }
  if (code === 1 || code === 2) {
    return { errorCode: "GRAPH_SERVER", technicalMessage: msg };
  }

  if (httpStatus >= 400 && httpStatus < 500) {
    return { errorCode: "GRAPH_CLIENT", technicalMessage: msg };
  }

  return { errorCode: "GRAPH_ERROR", technicalMessage: msg };
}

export function mapGraphHttpToPublishResult(
  status: number,
  data: Record<string, unknown>,
  telemetry: Omit<FacebookPublishTelemetry, "graphErrorCode" | "graphErrorSubcode" | "fbtraceId" | "httpStatus"> & {
    graphErrorCode?: number;
    graphErrorSubcode?: number;
    fbtraceId?: string;
  },
): FacebookPublishResult {
  const parsed = parseGraphErrorBody(data);
  const { errorCode, technicalMessage } = classifyGraphError(parsed, status);
  const userMessage = getFacebookPublishUserMessage(errorCode);

  return {
    success: false,
    errorCode,
    errorMessage: technicalMessage,
    userMessage,
    raw: data,
    telemetry: {
      ...telemetry,
      httpStatus: status,
      graphErrorCode: parsed?.code,
      graphErrorSubcode: parsed?.error_subcode,
      fbtraceId: parsed?.fbtrace_id,
    },
  };
}
