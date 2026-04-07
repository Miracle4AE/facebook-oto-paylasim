import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import type { FacebookAccountRow } from "@/lib/prisma-schema-types";
import { prisma, prismaFacebookOAuth } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto/token-vault";
import { getFacebookAppCredentials } from "@/services/facebook/facebook-graph-env";
import { loadFacebookAccountsHealth } from "@/services/facebook/facebook-token-health.service";
import { FacebookAccountsPanel } from "@/components/entegrasyon/facebook-accounts-panel";

export const dynamic = "force-dynamic";

type SearchParams = {
  fb_pending?: string;
  fb_error?: string;
  fb_desc?: string;
  fb_connected?: string;
  /** OAuth: kullanıcı kimliği ile bağlandı (sayfa token’ı yok) */
  fb_mode?: string;
};

export default async function IntegrationPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const accounts = await prisma.facebookAccount.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });

  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;

  let oauthPending: { stateId: string; pages: { id: string; name: string }[] } | null = null;
  const pendingId = searchParams.fb_pending;
  if (pendingId) {
    const st = await prismaFacebookOAuth.findFirst({
      where: {
        id: pendingId,
        userId: session.user.id,
        expiresAt: { gt: new Date() },
      },
    });
    if (st) {
      try {
        const raw = JSON.parse(decryptSecret(st.payloadEnc)) as {
          pages: Array<{ id: string; name: string; access_token: string }>;
        };
        oauthPending = {
          stateId: st.id,
          pages: raw.pages.map((p) => ({ id: p.id, name: p.name })),
        };
      } catch {
        oauthPending = null;
      }
    }
  }

  const hasAppCredentials = Boolean(getFacebookAppCredentials());

  const healthByAccountId = await loadFacebookAccountsHealth(session.user.id);
  const healthSerialized = Object.fromEntries(
    Object.entries(healthByAccountId).map(([id, h]) => [
      id,
      {
        status: h.status,
        message: h.message,
        checkedAt: h.checkedAt.toISOString(),
        expiresAt: h.expiresAt ? h.expiresAt.toISOString() : null,
      },
    ]),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Facebook entegrasyonu</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          İlk bağlantı temel hesap doğrulaması yapar. Gelişmiş izinler sonraki aşamada alınabilir. Token’lar sunucuda
          şifrelenir; üretimde{" "}
          <code className="rounded bg-muted px-1 text-xs">TOKEN_ENCRYPTION_KEY</code> kullanın.
        </p>
      </div>

      <FacebookAccountsPanel
        hasAppCredentials={hasAppCredentials}
        oauthPending={oauthPending}
        fbError={searchParams.fb_error ?? null}
        fbDesc={searchParams.fb_desc ?? null}
        showConnected={searchParams.fb_connected === "1"}
        connectedAsUserIdentity={searchParams.fb_mode === "user"}
        healthByAccountId={healthSerialized}
        accounts={accounts.map((a) => {
          const row = a as unknown as FacebookAccountRow;
          return {
            id: row.id,
            label: row.label,
            pageId: row.pageId,
            externalId: row.externalId,
            isActive: row.isActive,
            tokenExpiresAt: row.tokenExpiresAt,
            tokenExpiringSoon: row.tokenExpiresAt
              ? row.tokenExpiresAt.getTime() - now < weekMs
              : false,
          };
        })}
      />
    </div>
  );
}
