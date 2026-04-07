"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Copy, ExternalLink, Layers, Link2, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import type { GroupTargetSummary } from "@/types/group-target";
import {
  buildFacebookSharerUrl,
  buildShareablePlainText,
  extractFirstHttpUrl,
  FACEBOOK_MANUAL_GROUP_MAX_TABS,
  isBulkOpenAllowed,
  openUrlsInNewTabsSequential,
} from "@/lib/sharing/facebook-manual-share";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  groupTargets: GroupTargetSummary[];
  title: string | null;
  body: string;
};

export function ContentGroupShareSection({ groupTargets, title, body }: Props) {
  const [copyBusy, setCopyBusy] = useState(false);
  const [batchBusy, setBatchBusy] = useState(false);
  const lastBulkOpenAtRef = useRef(0);

  const shareText = buildShareablePlainText({ title, body });
  const linkInContent = extractFirstHttpUrl(body) ?? (title ? extractFirstHttpUrl(title) : null);
  const sharerUrl = linkInContent ? buildFacebookSharerUrl(linkInContent) : null;
  const hasText = shareText.trim().length > 0;

  const copyText = useCallback(async () => {
    if (!hasText) {
      toast.error("Kopyalanacak metin yok.");
      return;
    }
    setCopyBusy(true);
    try {
      await navigator.clipboard.writeText(shareText);
      toast.success("Metin panoya kopyalandı.");
    } catch {
      toast.error("Pano erişimi reddedildi veya kullanılamıyor.");
    } finally {
      setCopyBusy(false);
    }
  }, [hasText, shareText]);

  const openGroupTab = useCallback((url: string) => {
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (!w) {
      toast.error("Yeni sekme açılamadı. Tarayıcınızın açılır pencere engelini kontrol edin.");
    }
  }, []);

  const copyAndOpenGroup = useCallback(
    async (url: string) => {
      if (!hasText) {
        openGroupTab(url);
        return;
      }
      setCopyBusy(true);
      try {
        await navigator.clipboard.writeText(shareText);
        toast.success("Metin kopyalandı; grup sekmesi açılıyor.");
        window.setTimeout(() => openGroupTab(url), 120);
      } catch {
        toast.error("Metin kopyalanamadı; yine de grup sekmesi açılıyor.");
        openGroupTab(url);
      } finally {
        setCopyBusy(false);
      }
    },
    [hasText, openGroupTab, shareText],
  );

  const openSharerForLink = useCallback(() => {
    if (!sharerUrl) return;
    const w = window.open(sharerUrl, "_blank", "noopener,noreferrer");
    if (!w) {
      toast.error("Paylaşım penceresi açılamadı. Açılır pencere engelini kontrol edin.");
    }
  }, [sharerUrl]);

  const openAllGroups = useCallback(async () => {
    if (groupTargets.length === 0) return;
    const now = Date.now();
    if (!isBulkOpenAllowed(lastBulkOpenAtRef.current, now)) {
      toast.warning("Çok hızlı tekrar denendi", {
        description: "Güvenlik için toplu açma arasında kısa bir süre bekleyin.",
      });
      return;
    }
    lastBulkOpenAtRef.current = now;
    setBatchBusy(true);
    try {
      const urls = groupTargets.map((g) => g.url);
      const result = await openUrlsInNewTabsSequential(urls);
      if (groupTargets.length > FACEBOOK_MANUAL_GROUP_MAX_TABS) {
        toast.info("Sekme limiti", {
          description: `Güvenlik için en fazla ${FACEBOOK_MANUAL_GROUP_MAX_TABS} grup sekmesi açıldı.`,
        });
      }
      if (result.blockedOrFailed > 0) {
        toast.warning("Bazı sekmeler açılamadı", {
          description: "Tarayıcı veya açılır pencere ayarlarını kontrol edin.",
        });
      } else {
        toast.success(`${result.opened} grup sekmesi sırayla açıldı.`);
      }
    } finally {
      setBatchBusy(false);
    }
  }, [groupTargets]);

  if (groupTargets.length === 0) {
    return (
      <Card className="overflow-hidden border-border/80 bg-gradient-to-br from-muted/40 via-background to-background shadow-sm">
        <CardHeader className="space-y-1 pb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <CardTitle className="text-lg">Gruplarda paylaş</CardTitle>
              <CardDescription>Yarı otomatik yardımcı — hesabınızda kayıtlı grup yok.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <Alert className="border-amber-500/40 bg-amber-500/5">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            <AlertTitle className="text-foreground">Facebook kuralları</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              Grup paylaşımları Meta politikaları gereği manuel yapılır; bu panel otomatik gönderi oluşturmaz, yalnızca
              sekmeleri ve metni size yardımcı olur.
            </AlertDescription>
          </Alert>
          <p className="text-sm text-muted-foreground">
            Önce{" "}
            <Link href="/hedefler" className="font-medium text-primary underline underline-offset-4">
              Hedef kanallar
            </Link>{" "}
            bölümünden türü <span className="font-medium text-foreground">Grup</span> olacak şekilde Facebook grup
            bağlantınızı ekleyin.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-border/80 bg-gradient-to-br from-primary/[0.06] via-background to-background shadow-sm">
      <CardHeader className="space-y-3 pb-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/20">
              <Users className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <CardTitle className="text-lg tracking-tight">Gruplarda paylaş</CardTitle>
              <CardDescription className="mt-1 max-w-prose">
                Grup gönderilerini Facebook’ta siz oluşturursunuz; bu bölüm sekmeleri açmayı ve metni panoya almayı
                kolaylaştırır. Önce metni kopyalayıp ardından ilgili grupta yapıştırabilirsiniz.
              </CardDescription>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full gap-2 sm:w-auto"
              disabled={copyBusy || !hasText}
              onClick={() => void copyText()}
            >
              {copyBusy ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              ) : (
                <Copy className="h-4 w-4 shrink-0" aria-hidden />
              )}
              Metni kopyala
            </Button>
            {sharerUrl ? (
              <Button type="button" variant="outline" size="sm" className="w-full gap-2 sm:w-auto" onClick={openSharerForLink}>
                <Link2 className="h-4 w-4 shrink-0" aria-hidden />
                Linki paylaşım penceresinde aç
              </Button>
            ) : null}
          </div>
        </div>

        <Alert className="border-amber-500/35 bg-amber-500/[0.07]">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
          <AlertTitle className="text-foreground">Önemli</AlertTitle>
          <AlertDescription className="text-muted-foreground leading-relaxed">
            Facebook kuralları gereği grup paylaşımları manuel yapılır. Bu araç otomatik gönderi veya bot davranışı
            üretmez; yalnızca sekmeleri sırayla açar ve metni panoya alır.
          </AlertDescription>
        </Alert>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {linkInContent ? (
          <p className="text-xs text-muted-foreground">
            İçerikte tespit edilen bağlantı:{" "}
            <span className="break-all font-mono text-[11px] text-foreground/90">{linkInContent}</span>
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Metinde http(s) bağlantısı yok; paylaşım penceresi kısayolu devre dışı. İsterseniz metni kopyalayıp grupta
            yapıştırın.
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{groupTargets.length}</span> kayıtlı grup
            {groupTargets.length > FACEBOOK_MANUAL_GROUP_MAX_TABS
              ? ` — toplu açılışta en fazla ${FACEBOOK_MANUAL_GROUP_MAX_TABS} sekme`
              : null}
          </p>
          <Button
            type="button"
            variant="default"
            size="sm"
            className="gap-2"
            disabled={batchBusy}
            onClick={() => void openAllGroups()}
          >
            {batchBusy ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
            ) : (
              <Layers className="h-4 w-4 shrink-0" aria-hidden />
            )}
            Tüm grupları aç
          </Button>
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Aynı anda en fazla {FACEBOOK_MANUAL_GROUP_MAX_TABS} sekme; aralarında yaklaşık{" "}
          {500}–{800} ms gecikme uygulanır. Toplu açma kısa sürede bir kez önerilir.
        </p>

        <ul className="divide-y divide-border/60 rounded-xl border border-border/70 bg-card/50">
          {groupTargets.map((g) => (
            <li key={g.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-medium leading-tight text-foreground">{g.name}</p>
                {g.notes ? (
                  <p className="text-xs text-muted-foreground line-clamp-2">{g.notes}</p>
                ) : null}
                <p className="truncate text-[11px] font-mono text-muted-foreground/90">{g.url}</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => openGroupTab(g.url)}
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  Bu grupta paylaş
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="gap-2"
                  disabled={copyBusy || !hasText}
                  onClick={() => void copyAndOpenGroup(g.url)}
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                  Metni kopyala + grubu aç
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
