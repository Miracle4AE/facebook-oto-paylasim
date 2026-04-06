import type { FacebookAccountRow } from "@/lib/prisma-schema-types";
import { prisma } from "@/lib/prisma";
import { getFacebookAppCredentials } from "./facebook-graph-env";
import { getFacebookAccountPlainToken } from "./facebook-account-token";
import { classifyGraphError, parseGraphErrorBody } from "./facebook-graph-errors";
import { graphApiGet } from "./facebook-graph-http";
import {
  getFacebookHealthUserMessage,
  type FacebookHealthUiStatus,
} from "./facebook-user-messages";

const PAGE_PUBLISH_SCOPE = "pages_manage_posts";

export type FacebookAccountHealth = {
  accountId: string;
  status: FacebookHealthUiStatus;
  /** Kullanıcıya gösterilecek kısa Türkçe açıklama */
  message: string;
  checkedAt: Date;
  expiresAt?: Date | null;
};

function mapErrorCodeToHealthStatus(code: string): FacebookHealthUiStatus {
  if (code === "TOKEN_EXPIRED" || code === "INVALID_TOKEN") return "token_expired";
  if (code === "PERMISSION_DENIED") return "permission_denied";
  if (code === "NETWORK") return "network";
  return "unknown";
}

function healthFromGraphFailure(
  accountId: string,
  status: number,
  data: Record<string, unknown>,
  checkedAt: Date,
): FacebookAccountHealth {
  const parsed = parseGraphErrorBody(data);
  const { errorCode } = classifyGraphError(parsed, status);
  const ui = mapErrorCodeToHealthStatus(errorCode);
  return {
    accountId,
    status: ui,
    message: getFacebookHealthUserMessage(ui),
    checkedAt,
  };
}

/**
 * `debug_token` ile token geçerliliği, süre ve kapsamlar (uygulama kimliği gerekir).
 */
async function inspectWithDebugToken(
  account: FacebookAccountRow,
  token: string,
  checkedAt: Date,
): Promise<FacebookAccountHealth> {
  const creds = getFacebookAppCredentials();
  if (!creds) {
    if (account.pageId?.trim()) {
      return probePageEndpoint(account.id, account.pageId.trim(), token, checkedAt);
    }
    return {
      accountId: account.id,
      status: "app_unconfigured",
      message: getFacebookHealthUserMessage("app_unconfigured"),
      checkedAt,
    };
  }

  const qs = new URLSearchParams({
    input_token: token,
    access_token: `${creds.appId}|${creds.appSecret}`,
  });

  try {
    const { ok, status, data } = await graphApiGet(`/debug_token?${qs.toString()}`);
    const inner = data.data as
      | {
          is_valid?: boolean;
          expires_at?: number;
          scopes?: string[];
        }
      | undefined;

    if (!ok) {
      return healthFromGraphFailure(account.id, status, data, checkedAt);
    }

    if (!inner || inner.is_valid === false) {
      return {
        accountId: account.id,
        status: "invalid_token",
        message: getFacebookHealthUserMessage("invalid_token"),
        checkedAt,
      };
    }

    const scopes = Array.isArray(inner.scopes) ? inner.scopes : [];
    if (scopes.length > 0 && !scopes.includes(PAGE_PUBLISH_SCOPE)) {
      return {
        accountId: account.id,
        status: "permission_denied",
        message: getFacebookHealthUserMessage("permission_denied"),
        checkedAt,
      };
    }

    const expSec = inner.expires_at;
    let expiresAt: Date | null = null;
    if (typeof expSec === "number" && expSec > 0) {
      expiresAt = new Date(expSec * 1000);
      if (expiresAt.getTime() < Date.now()) {
        return {
          accountId: account.id,
          status: "token_expired",
          message: getFacebookHealthUserMessage("token_expired"),
          checkedAt,
          expiresAt,
        };
      }
    }

    return {
      accountId: account.id,
      status: "connected",
      message: getFacebookHealthUserMessage("connected"),
      checkedAt,
      expiresAt,
    };
  } catch {
    return {
      accountId: account.id,
      status: "network",
      message: getFacebookHealthUserMessage("network"),
      checkedAt,
    };
  }
}

/**
 * App kimliği yokken: sayfa düğümüne hafif okuma ile token doğrulaması.
 */
async function probePageEndpoint(
  accountId: string,
  pageId: string,
  token: string,
  checkedAt: Date,
): Promise<FacebookAccountHealth> {
  const qs = new URLSearchParams({
    fields: "id,name",
    access_token: token,
  });
  try {
    const { ok, status, data } = await graphApiGet(`/${pageId}?${qs.toString()}`);
    if (ok && typeof data.id === "string") {
      return {
        accountId,
        status: "connected",
        message: getFacebookHealthUserMessage("connected"),
        checkedAt,
      };
    }
    return healthFromGraphFailure(accountId, status, data, checkedAt);
  } catch {
    return {
      accountId,
      status: "network",
      message: getFacebookHealthUserMessage("network"),
      checkedAt,
    };
  }
}

/**
 * Tek hesap için Graph üzerinden sağlık kontrolü (sunucu tarafı).
 */
export async function checkFacebookAccountHealth(account: FacebookAccountRow): Promise<FacebookAccountHealth> {
  const checkedAt = new Date();
  const token = getFacebookAccountPlainToken(account).trim();

  if (!token) {
    return {
      accountId: account.id,
      status: "invalid_token",
      message: getFacebookHealthUserMessage("invalid_token"),
      checkedAt,
    };
  }

  return inspectWithDebugToken(account, token, checkedAt);
}

/**
 * Kullanıcının tüm Facebook hesapları için paralel sağlık özeti (entegrasyon sayfası).
 */
export async function loadFacebookAccountsHealth(userId: string): Promise<Record<string, FacebookAccountHealth>> {
  const accounts = await prisma.facebookAccount.findMany({
    where: { userId },
  });
  const pairs = await Promise.all(
    accounts.map(async (a) => {
      const h = await checkFacebookAccountHealth(a as unknown as FacebookAccountRow);
      return [a.id, h] as const;
    }),
  );
  return Object.fromEntries(pairs);
}
