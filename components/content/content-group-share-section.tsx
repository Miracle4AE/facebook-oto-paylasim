"use client";

import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Copy,
  ExternalLink,
  Layers,
  Link2,
  Loader2,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  logBulkGroupShareSequence,
  logGroupShareEvent,
  upsertGroupShareDraft,
} from "@/actions/group-share";
import { useBillingPaywall } from "@/components/billing/billing-paywall-context";
import type { GroupTargetSummary } from "@/types/group-target";
import { ContentGroupShareLogKind, type GroupTargetShareStat } from "@/types/group-share";
import {
  buildFacebookSharerUrl,
  buildShareablePlainText,
  copyTextAndOpenUrlsSequential,
  extractFirstHttpUrl,
  FACEBOOK_MANUAL_GROUP_MAX_TABS,
  isBulkOpenAllowed,
  openUrlsInNewTabsSequential,
} from "@/lib/sharing/facebook-manual-share";
import { resolveEffectiveGroupShareText } from "@/lib/sharing/group-share-text";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function TipButton({
  label,
  children,
  side = "top",
}: {
  label: string;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} className="max-w-[260px] text-left leading-snug">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

type Props = {
  contentPostId: string;
  groupTargets: GroupTargetSummary[];
  initialDraftByTargetId: Record<string, string>;
  statsByTargetId: Record<string, GroupTargetShareStat>;
  title: string | null;
  body: string;
};

type GuidePhase = "intro" | "step" | "done";

export function ContentGroupShareSection({
  contentPostId,
  groupTargets,
  initialDraftByTargetId,
  statsByTargetId,
  title,
  body,
}: Props) {
  const router = useRouter();
  const paywall = useBillingPaywall();
  const [overrides, setOverrides] = useState<Record<string, string>>(() => ({ ...initialDraftByTargetId }));
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const baseShareText = useMemo(() => buildShareablePlainText({ title, body }), [title, body]);
  const linkInContent =
    extractFirstHttpUrl(body) ?? (title ? extractFirstHttpUrl(title) : null);
  const sharerUrl = linkInContent ? buildFacebookSharerUrl(linkInContent) : null;
  const hasBaseText = baseShareText.trim().length > 0;

  const queueDraftSave = useCallback(
    (targetChannelId: string, customText: string) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        void (async () => {
          const res = await upsertGroupShareDraft({
            contentPostId,
            targetChannelId,
            customText: customText.trim() === "" ? null : customText,
          });
          if (!res.ok) {
            toast.error(res.error ?? "Taslak kaydedilemedi");
          }
        })();
      }, 600);
    },
    [contentPostId],
  );

  const onOverrideChange = (targetId: string, value: string) => {
    setOverrides((prev) => ({ ...prev, [targetId]: value }));
    queueDraftSave(targetId, value);
  };

  const [copyBusy, setCopyBusy] = useState(false);
  const [batchBusy, setBatchBusy] = useState(false);
  const [premiumBusy, setPremiumBusy] = useState(false);
  const lastBulkOpenAtRef = useRef(0);

  const [guideOpen, setGuideOpen] = useState(false);
  const [guidePhase, setGuidePhase] = useState<GuidePhase>("intro");
  const [guideIndex, setGuideIndex] = useState(0);
  const [guideBusy, setGuideBusy] = useState(false);
  const [celebrateTargetId, setCelebrateTargetId] = useState<string | null>(null);

  const openGroupTab = useCallback((url: string) => {
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (!w) {
      toast.error("Yeni sekme açılamadı. Açılır pencere engelini kontrol edin.");
    }
  }, []);

  const copyText = useCallback(async () => {
    if (!hasBaseText) {
      toast.error("Kopyalanacak metin yok.");
      return;
    }
    setCopyBusy(true);
    try {
      await navigator.clipboard.writeText(baseShareText);
      toast.success("Varsayılan metin panoya kopyalandı.");
    } catch {
      toast.error("Pano erişimi reddedildi.");
    } finally {
      setCopyBusy(false);
    }
  }, [hasBaseText, baseShareText]);

  const openSharerForLink = useCallback(() => {
    if (!sharerUrl) return;
    const w = window.open(sharerUrl, "_blank", "noopener,noreferrer");
    if (!w) {
      toast.error("Paylaşım penceresi açılamadı.");
    }
  }, [sharerUrl]);

  const effectiveTextFor = useCallback(
    (targetId: string) =>
      resolveEffectiveGroupShareText({
        title,
        body,
        customOverride: overrides[targetId],
      }),
    [title, body, overrides],
  );

  const copyAndOpenGroup = useCallback(
    async (targetId: string, url: string) => {
      const text = effectiveTextFor(targetId);
      setCopyBusy(true);
      try {
        if (text.trim().length > 0) {
          await navigator.clipboard.writeText(text);
        }
        toast.success("Metin kopyalandı; grup açılıyor.");
        window.setTimeout(() => openGroupTab(url), 100);
        const log = await logGroupShareEvent({
          contentPostId,
          targetChannelId: targetId,
          eventKind: ContentGroupShareLogKind.OPENED,
        });
        if (!log.ok) {
          toast.error(log.error ?? "Kayıt eklenemedi");
        } else {
          router.refresh();
        }
      } catch {
        toast.error("Metin kopyalanamadı.");
        openGroupTab(url);
      } finally {
        setCopyBusy(false);
      }
    },
    [contentPostId, effectiveTextFor, openGroupTab, router],
  );

  const markDone = useCallback(
    async (targetId: string) => {
      const res = await logGroupShareEvent({
        contentPostId,
        targetChannelId: targetId,
        eventKind: ContentGroupShareLogKind.MARKED_DONE,
      });
      if (!res.ok) {
        toast.error(res.error ?? "Kaydedilemedi");
        return;
      }
      setCelebrateTargetId(targetId);
      window.setTimeout(() => setCelebrateTargetId(null), 1400);
      toast.success("Harika — kayıt güncellendi", {
        description: "Bu gruptaki paylaşımınız istatistiklere yansıdı.",
        duration: 3800,
        className: "border-emerald-500/25 bg-gradient-to-r from-emerald-500/10 to-background",
      });
      router.refresh();
    },
    [contentPostId, router],
  );

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
          description: `En fazla ${FACEBOOK_MANUAL_GROUP_MAX_TABS} sekme açıldı.`,
        });
      }
      if (result.blockedOrFailed > 0) {
        toast.warning("Bazı sekmeler açılamadı.");
      } else {
        toast.success(`${result.opened} grup sekmesi sırayla açıldı.`);
      }
    } finally {
      setBatchBusy(false);
    }
  }, [groupTargets]);

  const runPremiumSequence = useCallback(async () => {
    if (groupTargets.length === 0) return;
    const now = Date.now();
    if (!isBulkOpenAllowed(lastBulkOpenAtRef.current, now)) {
      toast.warning("Çok hızlı tekrar denendi", {
        description: "Kısa bir süre sonra tekrar deneyin.",
      });
      return;
    }
    lastBulkOpenAtRef.current = now;
    setPremiumBusy(true);
    try {
      const capped = groupTargets.slice(0, FACEBOOK_MANUAL_GROUP_MAX_TABS);
      const items = capped.map((g) => ({
        url: g.url,
        text: effectiveTextFor(g.id),
      }));
      const result = await copyTextAndOpenUrlsSequential(items);
      if (result.copyFailures > 0) {
        toast.warning("Bazı kopyalama adımları başarısız oldu.", {
          description: "Tarayıcı pano iznini kontrol edin.",
        });
      }
      if (result.blockedOrFailed > 0) {
        toast.warning("Bazı sekmeler açılamadı.");
      }
      const log = await logBulkGroupShareSequence({
        contentPostId,
        targetChannelIds: capped.map((g) => g.id),
      });
      if (!log.ok) {
        toast.error(log.error ?? "Kayıt oluşturulamadı");
        if ("code" in log && log.code === "PLAN_LIMIT") {
          paywall?.openPaywall(log.error);
        }
      } else {
        toast.success("Hızlı paylaşım tamam", {
          description: "Metinler sırayla kopyalandı; grup sekmeleri açıldı.",
        });
        router.refresh();
      }
    } finally {
      setPremiumBusy(false);
    }
  }, [contentPostId, effectiveTextFor, groupTargets, paywall, router]);

  const resetGuide = () => {
    setGuidePhase("intro");
    setGuideIndex(0);
  };

  const closeGuide = () => {
    setGuideOpen(false);
    resetGuide();
  };

  const runGuideStep = async () => {
    const g = groupTargets[guideIndex];
    if (!g) return;
    setGuideBusy(true);
    try {
      const text = effectiveTextFor(g.id);
      if (text.trim().length > 0) {
        await navigator.clipboard.writeText(text);
      }
      openGroupTab(g.url);
      const log = await logGroupShareEvent({
        contentPostId,
        targetChannelId: g.id,
        eventKind: ContentGroupShareLogKind.OPENED,
      });
      if (!log.ok) {
        toast.error(log.error ?? "Kayıt eklenemedi");
      } else {
        router.refresh();
      }
      if (guideIndex >= groupTargets.length - 1) {
        setGuidePhase("done");
      } else {
        setGuideIndex((i) => i + 1);
      }
    } catch {
      toast.error("Bu adım tamamlanamadı.");
    } finally {
      setGuideBusy(false);
    }
  };

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
              <CardDescription>Grup ekleyince burası güçlenir — şimdilik hedef yok.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-violet-500/[0.04] to-background p-4 shadow-sm">
            <p className="text-sm font-semibold text-foreground">Önce grup ekle</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Aynı içeriği onlarca gruba dakikalar içinde taşımak için hedeflerinizi kaydedin. Zaman kazandırır, daha fazla
              kişiye ulaşırsınız — spam gibi görünmez, siz kontrol edersiniz.
            </p>
            <Button className="mt-4 w-full sm:w-auto" asChild>
              <Link href="/hedefler">Grup hedefi ekle →</Link>
            </Button>
          </div>
          <Alert className="border-amber-500/40 bg-amber-500/5">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            <AlertTitle className="text-foreground">Facebook kuralları</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              Grup paylaşımları Meta politikaları gereği manuel yapılır; bu panel otomatik gönderi oluşturmaz.
            </AlertDescription>
          </Alert>
          <p className="text-xs text-muted-foreground">
            <Link href="/hedefler" className="font-medium text-primary underline underline-offset-4">
              Hedef kanallar
            </Link>{" "}
            → <span className="font-medium text-foreground">Yeni hedef</span> → tür: <strong>Grup</strong>, grup
            bağlantısını yapıştırın.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden border-border/80 bg-gradient-to-br from-violet-500/[0.07] via-background to-background shadow-md ring-1 ring-border/60">
        <CardHeader className="space-y-4 pb-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-primary/15 text-primary ring-1 ring-primary/25">
                <Sparkles className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <CardTitle className="text-lg tracking-tight">Gruplarda paylaş</CardTitle>
                <CardDescription className="mt-1 max-w-prose leading-relaxed">
                  Aynı içeriği 20 gruba kadar birkaç dakikada yayın: kopyalama + sekmeler tek akışta. İsterseniz grup
                  başına özel metin yazın.
                </CardDescription>
              </div>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
              <TipButton
                label="Her grup için metni sırayla panoya alır ve grup sekmelerini açar. Facebook’ta gönderiyi yayımlayan sizsiniz — bot değil, kurallara uygundur."
                side="left"
              >
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="w-full gap-2 bg-gradient-to-r from-violet-600 to-primary shadow-sm sm:w-auto"
                  disabled={premiumBusy}
                  onClick={() => void runPremiumSequence()}
                >
                  {premiumBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
                  )}
                  Hızlı paylaşımı başlat
                </Button>
              </TipButton>
              <TipButton
                label="Her grupta sırayla: metin kopya → grup sekmesi açılır. Yeni başlayanlar için adım adım rehber."
                side="left"
              >
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full gap-2 sm:w-auto"
                  onClick={() => {
                    resetGuide();
                    setGuideOpen(true);
                  }}
                >
                  <ChevronRight className="h-4 w-4" aria-hidden />
                  Rehberli adım adım akış
                </Button>
              </TipButton>
            </div>
          </div>

          <div className="rounded-xl border border-primary/15 bg-gradient-to-r from-primary/[0.04] via-violet-500/[0.05] to-transparent px-4 py-3">
            <p className="text-sm font-semibold text-foreground">1 saatlik işi dakikalara indir</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Tek akışta metin + sekmeler: <strong className="text-foreground">zaman kazandırır</strong>,{" "}
              <strong className="text-foreground">spam gibi görünmez</strong>,{" "}
              <strong className="text-foreground">daha fazla kişiye ulaşırsınız</strong>.
            </p>
            <p className="mt-2 text-[11px] font-medium text-primary/90">
              Aynı içeriği 20 gruba kadar birkaç dakikada yayın — siz yalnızca grupta &quot;Paylaş&quot;a basın.
            </p>
          </div>

          <Alert className="border-amber-500/35 bg-amber-500/[0.07]">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            <AlertTitle className="text-foreground">Önemli</AlertTitle>
            <AlertDescription className="text-muted-foreground leading-relaxed">
              Meta kuralları: gönderiyi siz yayımlarsınız. Araç yalnızca pano + sekme yardımı verir; otomatik spam
              yoktur.
            </AlertDescription>
          </Alert>
        </CardHeader>

        <CardContent className="space-y-6 pt-0">
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <BarChart3 className="h-4 w-4 text-primary" aria-hidden />
              Grup performansı (özet)
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {groupTargets.map((g) => {
                const s = statsByTargetId[g.id];
                return (
                  <div
                    key={g.id}
                    className="rounded-lg border border-border/50 bg-card/80 px-3 py-2.5 text-xs shadow-sm"
                  >
                    <p className="truncate font-medium text-foreground">{g.name}</p>
                    <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                      <dt>Sekme açılışı</dt>
                      <dd className="text-right font-mono text-foreground">{s?.openCount ?? 0}</dd>
                      <dt>Paylaştım</dt>
                      <dd className="text-right font-mono text-foreground">{s?.markedDoneCount ?? 0}</dd>
                    </dl>
                    {s?.lastMarkedAt ? (
                      <p className="mt-2 text-[10px] text-muted-foreground">
                        Son işaretleme: {format(s.lastMarkedAt, "d MMM yyyy HH:mm", { locale: tr })}
                      </p>
                    ) : (
                      <p className="mt-2 text-[10px] text-muted-foreground/90">Tamamlanma henüz işaretlenmedi</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-b border-border/50 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <TipButton label="İçeriğin başlık + gövde metnini panoya kopyalar. Grup özel metni yazmadıysanız bu metin kullanılır.">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={copyBusy || !hasBaseText}
                  onClick={() => void copyText()}
                >
                  {copyBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                  Varsayılan metni kopyala
                </Button>
              </TipButton>
              {sharerUrl ? (
                <TipButton label="İçerikteki ilk http(s) bağlantısını Facebook paylaşım penceresinde açar (önce metni kopyalamayı unutmayın).">
                  <Button type="button" variant="outline" size="sm" className="gap-2" onClick={openSharerForLink}>
                    <Link2 className="h-4 w-4" />
                    Linki paylaşım penceresinde aç
                  </Button>
                </TipButton>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <TipButton label="Metni kopyalamadan yalnızca grup URL’lerini sırayla açar. Önce metni kopyalayıp ardından bu seçeneği kullanmak isterseniz üstteki varsayılan kopyayı kullanın.">
                <Button type="button" variant="secondary" size="sm" className="gap-2" disabled={batchBusy} onClick={() => void openAllGroups()}>
                  {batchBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
                  Yalnızca sekmeleri aç
                </Button>
              </TipButton>
            </div>
          </div>

          {linkInContent ? (
            <p className="text-xs text-muted-foreground">
              Tespit edilen bağlantı:{" "}
              <span className="break-all font-mono text-[11px] text-foreground/90">{linkInContent}</span>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Metinde http(s) bağlantısı yoksa paylaşım penceresi kısayolu devre dışıdır.
            </p>
          )}

          <p className="text-[11px] text-muted-foreground">
            En fazla {FACEBOOK_MANUAL_GROUP_MAX_TABS} sekme; aralarında kısa gecikme — tarayıcı spam korumasına uyum.
          </p>

          <ul className="divide-y divide-border/60 rounded-xl border border-border/70 bg-card/40">
            {groupTargets.map((g) => {
              const eff = effectiveTextFor(g.id);
              const usingOverride = (overrides[g.id]?.trim() ?? "").length > 0;
              return (
                <li
                  key={g.id}
                  className={`space-y-3 rounded-lg p-4 transition-all duration-500 ${
                    celebrateTargetId === g.id
                      ? "bg-emerald-500/[0.08] ring-2 ring-emerald-500/50 shadow-[0_0_0_1px_rgba(16,185,129,0.2)]"
                      : ""
                  }`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="font-semibold leading-tight text-foreground">{g.name}</p>
                      {g.notes ? <p className="text-xs text-muted-foreground">{g.notes}</p> : null}
                      <p className="truncate text-[11px] font-mono text-muted-foreground/90">{g.url}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {usingOverride ? "Bu grup için özel metin kullanılıyor." : "Varsayılan içerik metni kullanılıyor."}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <TipButton label="Grubu yeni sekmede açar; metni kendiniz yapıştırırsınız.">
                        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => openGroupTab(g.url)}>
                          <ExternalLink className="h-3.5 w-3.5" />
                          Grubu aç ve paylaş
                        </Button>
                      </TipButton>
                      <TipButton label="Bu gruba özel (veya varsayılan) metni kopyalar ve grup sayfasını açar.">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="gap-2"
                          disabled={copyBusy}
                          onClick={() => void copyAndOpenGroup(g.id, g.url)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Kopyala + grubu aç
                        </Button>
                      </TipButton>
                      <TipButton label="Facebook’ta gönderiyi yayımladıktan sonra işaretleyin; istatistiklerinize ve ‘Paylaştım’ sayısına eklenir.">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="gap-2 text-primary"
                          onClick={() => void markDone(g.id)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Paylaştım
                        </Button>
                      </TipButton>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground" htmlFor={`grp-msg-${g.id}`}>
                      Bu gruba özel mesaj (isteğe bağlı)
                    </label>
                    <Textarea
                      id={`grp-msg-${g.id}`}
                      placeholder={baseShareText.slice(0, 200) + (baseShareText.length > 200 ? "…" : "")}
                      value={overrides[g.id] ?? ""}
                      onChange={(e) => onOverrideChange(g.id, e.target.value)}
                      rows={4}
                      className="min-h-[96px] resize-y text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Boş bırakırsanız içerik başlığı + gövdesi kullanılır. Önizleme uzunluğu: {eff.length} karakter.
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Dialog open={guideOpen} onOpenChange={(o) => !o && closeGuide()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          {guidePhase === "intro" ? (
            <>
              <DialogHeader>
                <DialogTitle>Rehberli paylaşım</DialogTitle>
                <DialogDescription className="text-left leading-relaxed">
                  Her adımda bu gruba ait metin panoya kopyalanır ve grup sekmesi açılır. Paylaşımı Facebook’ta siz
                  tamamlarsınız. Toplam <strong className="text-foreground">{groupTargets.length}</strong> grup.
                </DialogDescription>
              </DialogHeader>
              <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
                <li>Metni kontrol edin (üstteki alanlardan grup başına özelleştirebilirsiniz).</li>
                <li>Her adımda kopyala + sekme açılır.</li>
                <li>Grubda yayınladıktan sonra ana listede &quot;Paylaştım&quot; ile işaretleyebilirsiniz.</li>
              </ol>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeGuide}>
                  Vazgeç
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setGuidePhase("step");
                    setGuideIndex(0);
                  }}
                >
                  Başla
                </Button>
              </DialogFooter>
            </>
          ) : null}

          {guidePhase === "step" && groupTargets[guideIndex] ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  Adım {guideIndex + 1} / {groupTargets.length}
                </DialogTitle>
                <DialogDescription>{groupTargets[guideIndex].name}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Progress value={((guideIndex + 1) / groupTargets.length) * 100} />
                <Textarea readOnly value={effectiveTextFor(groupTargets[guideIndex].id)} rows={8} className="font-mono text-xs" />
              </div>
              <DialogFooter className="gap-2 sm:justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (guideIndex <= 0) {
                      setGuidePhase("intro");
                    } else {
                      setGuideIndex((i) => i - 1);
                    }
                  }}
                >
                  Geri
                </Button>
                <Button type="button" disabled={guideBusy} onClick={() => void runGuideStep()}>
                  {guideBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Metni kopyala ve bu grubu aç
                </Button>
              </DialogFooter>
            </>
          ) : null}

          {guidePhase === "done" ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  Rehber tamamlandı
                </DialogTitle>
                <DialogDescription>
                  Tüm gruplar için adımlar uygulandı. Gönderileri Facebook’ta yayımladıysanız ana listeden
                  &quot;Paylaştım&quot; ile işaretleyebilirsiniz.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button type="button" onClick={closeGuide}>
                  Kapat
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
