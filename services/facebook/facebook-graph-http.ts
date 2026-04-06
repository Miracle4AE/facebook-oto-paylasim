import { FACEBOOK_GRAPH_VERSION } from "./facebook-graph-env";
import { appLogger } from "@/services/logging/app-logger";

export function graphApiBaseUrl(): string {
  return `https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}`;
}

async function safeParseJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {
      _nonJson: true,
      _snippet: text.slice(0, 400),
    };
  }
}

export type GraphHttpResult = {
  ok: boolean;
  status: number;
  data: Record<string, unknown>;
  durationMs: number;
};

/**
 * Graph POST — gövdede access_token vardır; loglarda yalnızca yol ve meta verilir.
 */
export async function graphApiPost(endpointPath: string, body: URLSearchParams): Promise<GraphHttpResult> {
  const url = `${graphApiBaseUrl()}${endpointPath}`;
  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", body });
  } catch (e) {
    const durationMs = Date.now() - started;
    appLogger.warn(
      "facebook.graph.network_error",
      {
        endpoint: endpointPath,
        method: "POST",
        durationMs: String(durationMs),
      },
      e instanceof Error ? e : new Error(String(e)),
    );
    throw e;
  }
  const data = await safeParseJson(res);
  const durationMs = Date.now() - started;
  logFacebookGraphResponse({
    endpoint: endpointPath,
    method: "POST",
    httpStatus: res.status,
    durationMs,
    hasGraphError: Boolean((data as { error?: unknown }).error),
    nonJson: data._nonJson === true,
  });
  return { ok: res.ok, status: res.status, data, durationMs };
}

export async function graphApiGet(endpointPath: string): Promise<GraphHttpResult> {
  const url = `${graphApiBaseUrl()}${endpointPath}`;
  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(url, { method: "GET" });
  } catch (e) {
    const durationMs = Date.now() - started;
    appLogger.warn(
      "facebook.graph.network_error",
      {
        endpoint: endpointPath.split("?")[0] ?? endpointPath,
        method: "GET",
        durationMs: String(durationMs),
      },
      e instanceof Error ? e : new Error(String(e)),
    );
    throw e;
  }
  const data = await safeParseJson(res);
  const durationMs = Date.now() - started;
  logFacebookGraphResponse({
    endpoint: endpointPath.split("?")[0] ?? endpointPath,
    method: "GET",
    httpStatus: res.status,
    durationMs,
    hasGraphError: Boolean((data as { error?: unknown }).error),
    nonJson: data._nonJson === true,
  });
  return { ok: res.ok, status: res.status, data, durationMs };
}

function logFacebookGraphResponse(params: {
  endpoint: string;
  method: "GET" | "POST";
  httpStatus: number;
  durationMs: number;
  hasGraphError: boolean;
  nonJson: boolean;
}): void {
  appLogger.info("facebook.graph.response", {
    endpoint: params.endpoint,
    method: params.method,
    httpStatus: String(params.httpStatus),
    durationMs: String(params.durationMs),
    hasGraphError: params.hasGraphError ? "true" : "false",
    nonJsonBody: params.nonJson ? "true" : "false",
  });
}
