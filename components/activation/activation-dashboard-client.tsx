"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PartyPopper, Sparkles } from "lucide-react";
import type { ActivationMilestones } from "@/lib/activation-state";
import { isActivationComplete } from "@/lib/activation-state";
import { ActivationBar } from "@/components/activation/activation-bar";
import { ActivationQuickStartModal } from "@/components/activation/activation-quick-start-modal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ActivationQuickActionsProvider } from "@/components/activation/activation-quick-actions-context";

const LS_OVERLAY = "activation-overlay-dismissed-v1";
const LS_CELEBRATION = "activation-celebration-shown-v1";
const SS_WINDOW = "activation-dashboard-t0";

type GroupOption = { id: string; name: string };

type Props = {
  activation: ActivationMilestones;
  groupTargets: GroupOption[];
  children: React.ReactNode;
};

function readDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(LS_OVERLAY) === "1";
  } catch {
    return false;
  }
}

function readCelebrationShown(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(LS_CELEBRATION) === "1";
  } catch {
    return true;
  }
}

function getSessionWindowStart(): number {
  if (typeof window === "undefined") return Date.now();
  try {
    const raw = window.sessionStorage.getItem(SS_WINDOW);
    if (raw) {
      const n = Number.parseInt(raw, 10);
      if (!Number.isNaN(n)) return n;
    }
    const t = Date.now();
    window.sessionStorage.setItem(SS_WINDOW, String(t));
    return t;
  } catch {
    return Date.now();
  }
}

export function ActivationDashboardClient({ activation, groupTargets, children }: Props) {
  const [overlayDismissed, setOverlayDismissed] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  const [inFirstTwoMinutes, setInFirstTwoMinutes] = useState(false);

  const coldStart = useMemo(
    () => !activation.hasGroupTarget && !activation.hasContent && !activation.hasFirstShare,
    [activation.hasContent, activation.hasFirstShare, activation.hasGroupTarget],
  );

  const allComplete = isActivationComplete(activation);

  useEffect(() => {
    setOverlayDismissed(readDismissed());
    const t0 = getSessionWindowStart();
    const tick = () => {
      setInFirstTwoMinutes(Date.now() - t0 < 2 * 60 * 1000);
    };
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!activation.hasFirstShare) return;
    if (readCelebrationShown()) return;
    // İlk yüklemede kutlama (bir kez localStorage ile)
    setCelebrationOpen(true);
  }, [activation.hasFirstShare]);

  const showBlockingOverlay = coldStart && !overlayDismissed;
  const showInlineColdCta = coldStart && overlayDismissed;
  const showPartialQuickStart = !allComplete && !coldStart;

  function dismissOverlayPersist() {
    try {
      window.localStorage.setItem(LS_OVERLAY, "1");
    } catch {
      /* ignore */
    }
    setOverlayDismissed(true);
  }

  function openQuickFromOverlay() {
    dismissOverlayPersist();
    setQuickOpen(true);
  }

  function closeCelebration() {
    try {
      window.localStorage.setItem(LS_CELEBRATION, "1");
    } catch {
      /* ignore */
    }
    setCelebrationOpen(false);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <ActivationBar activation={activation} inFirstTwoMinutes={inFirstTwoMinutes && !allComplete} />
        {showPartialQuickStart && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" className="gap-1.5" onClick={() => setQuickOpen(true)}>
              <Sparkles className="h-3.5 w-3.5" />
              30 saniyede ilk paylaşımı yap
            </Button>
          </div>
        )}
      </div>

      {showInlineColdCta && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-primary/35 bg-primary/5 px-4 py-8 text-center sm:py-10">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">Hızlı başlangıç</p>
          <h2 className="text-balance text-xl font-semibold sm:text-2xl">İlk paylaşımını başlat</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Grup ekle, kısa içerik yaz, paylaşımı başlat — tek akışta ilerle.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button size="lg" className="gap-2" type="button" onClick={() => setQuickOpen(true)}>
              <Sparkles className="h-4 w-4" />
              30 saniyede ilk paylaşımı yap
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/hedefler">Grup ekle</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Zaman kazanıyorsun · Daha fazla kişiye ulaşıyorsun</p>
        </div>
      )}

      <ActivationQuickActionsProvider openQuickStart={() => setQuickOpen(true)}>{children}</ActivationQuickActionsProvider>

      <Dialog open={showBlockingOverlay} onOpenChange={(o) => !o && dismissOverlayPersist()}>
        <DialogContent className="max-w-md border-primary/30 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl sm:text-3xl">İlk paylaşımını başlat</DialogTitle>
            <DialogDescription className="text-center text-base">
              Birkaç adımda kurulumu bitir; ardından paylaşımı tek tıkla yönet.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <Button size="lg" className="w-full gap-2" type="button" onClick={openQuickFromOverlay}>
              <Sparkles className="h-5 w-5" />
              30 saniyede ilk paylaşımı yap
            </Button>
            <Button variant="outline" className="w-full" type="button" asChild>
              <Link href="/hedefler" onClick={dismissOverlayPersist}>
                Önce grup ekle
              </Link>
            </Button>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button variant="ghost" type="button" className="text-muted-foreground" onClick={dismissOverlayPersist}>
              Sonra hatırlat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ActivationQuickStartModal open={quickOpen} onOpenChange={setQuickOpen} groupTargets={groupTargets} />

      <Dialog open={celebrationOpen} onOpenChange={(o) => !o && closeCelebration()}>
        <DialogContent className="max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
            <PartyPopper className="h-8 w-8 text-primary" aria-hidden />
          </div>
          <DialogHeader>
            <DialogTitle className="text-2xl">Tebrikler</DialogTitle>
            <DialogDescription className="text-base text-foreground/90">
              İlk paylaşımını tamamladın. Artık sistemi kullanıyorsun — içerik ve grupları buradan yönetmeye devam et.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Zaman kazanıyorsun · Daha fazla kişiye ulaşıyorsun</p>
          <DialogFooter className="sm:justify-center">
            <Button type="button" size="lg" onClick={closeCelebration}>
              Devam et
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
