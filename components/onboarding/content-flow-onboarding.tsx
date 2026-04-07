"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Layers, MousePointerClick, Sparkles, Target } from "lucide-react";
import {
  getHasSeenContentFlowOnboarding,
  setContentFlowOnboardingSeen,
} from "@/lib/storage/content-onboarding";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STEPS = [
  {
    title: "1. Önce gruplarınızı ekleyin",
    icon: Target,
    body:
      "Facebook gruplarınızı Hedef kanallar bölümünde “Grup” türüyle kaydedin. Böylece paylaşım sırasında her grup için tek tıkla açılacak bağlantılar hazır olur.",
    cta: { href: "/hedefler", label: "Hedef kanallara git" },
  },
  {
    title: "2. İçeriğinizi hazırlayın",
    icon: Layers,
    body:
      "Bu sayfada gördüğünüz metin, gruplara yapıştıracağınız paylaşımdır. İsterseniz her grup için ayrı metin de yazabilirsiniz.",
    cta: { href: "/icerikler/yeni", label: "Yeni içerik oluştur" },
  },
  {
    title: "3. Tek tuşla paylaşım akışını çalıştırın",
    icon: MousePointerClick,
    body:
      "“Tek tuş: kopyala + grupları sırayla aç” düğmesi, her grupta metni sırayla panoya alır ve grup sekmelerini açar. Facebook’ta gönderiyi yayımlayan sizsiniz — bu araç sizi kopyala–sekme–yapıştır döngüsünde on kata kadar hızlandırır.",
    cta: null,
  },
] as const;

export function ContentFlowOnboarding() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    setMounted(true);
    if (!getHasSeenContentFlowOnboarding()) {
      setOpen(true);
    }
  }, []);

  if (!mounted) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  function finish() {
    setContentFlowOnboardingSeen();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && finish()}>
      <DialogContent className="gap-0 overflow-hidden border-border/80 bg-gradient-to-b from-background to-muted/20 p-0 sm:max-w-lg">
        <div className="border-b border-border/60 bg-primary/5 px-6 py-4">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5 shrink-0" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wide">Hızlı başlangıç</span>
          </div>
          <DialogHeader className="mt-2 space-y-1 text-left">
            <DialogTitle className="text-xl font-semibold tracking-tight">
              Grup paylaşımını 10 saniyede anlayın
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
              Üç kısa adımda ne yapacağınız netleşsin; değer hemen anlaşılsın.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="flex justify-center gap-2">
            {STEPS.map((s, i) => (
              <button
                key={s.title}
                type="button"
                aria-label={`Adım ${i + 1}`}
                className={
                  i === step
                    ? "h-2 w-8 rounded-full bg-primary transition-colors"
                    : "h-2 w-2 rounded-full bg-muted-foreground/30 transition-colors hover:bg-muted-foreground/50"
                }
                onClick={() => setStep(i)}
              />
            ))}
          </div>

          <div className="flex gap-4 rounded-xl border border-border/60 bg-card/60 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-6 w-6" aria-hidden />
            </div>
            <div className="min-w-0 space-y-2">
              <h3 className="font-semibold leading-snug text-foreground">{current.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{current.body}</p>
              {current.cta ? (
                <Button variant="link" className="h-auto px-0 text-primary" asChild>
                  <Link href={current.cta.href}>{current.cta.label} →</Link>
                </Button>
              ) : null}
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-dashed border-primary/25 bg-primary/[0.04] px-3 py-2.5 text-xs text-muted-foreground">
            <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <p>
              İpucu: Aşağıdaki “Gruplarda paylaş” kartında metinleri özelleştirip istatistikleri takip edebilirsiniz.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 border-t border-border/60 bg-muted/20 px-6 py-4 sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={finish}>
            Şimdi değil
          </Button>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {step > 0 ? (
              <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
                Geri
              </Button>
            ) : null}
            {!isLast ? (
              <Button type="button" onClick={() => setStep((s) => s + 1)}>
                İleri
              </Button>
            ) : (
              <Button type="button" onClick={finish}>
                Anladım, devam et
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
