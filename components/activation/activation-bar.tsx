"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivationMilestones } from "@/lib/activation-state";
import { activationProgressPercent } from "@/lib/activation-state";
import { Progress } from "@/components/ui/progress";

type Props = {
  activation: ActivationMilestones;
  inFirstTwoMinutes: boolean;
};

const steps: { key: keyof ActivationMilestones; label: string }[] = [
  { key: "hasGroupTarget", label: "Grup ekle" },
  { key: "hasContent", label: "İçerik oluştur" },
  { key: "hasFirstShare", label: "İlk paylaşımı başlat" },
];

export function ActivationBar({ activation, inFirstTwoMinutes }: Props) {
  const pct = activationProgressPercent(activation);
  const complete = activation.hasGroupTarget && activation.hasContent && activation.hasFirstShare;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card/80 p-4 shadow-sm backdrop-blur-sm",
        !complete && inFirstTwoMinutes && "border-primary/40 ring-1 ring-primary/20",
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium leading-tight">İlk kurulum</p>
          <p className="text-xs text-muted-foreground">
            {complete
              ? "Kurulum tamam — akışa devam edebilirsin."
              : inFirstTwoMinutes
                ? "İlk dakikalarda tamamla; alışkanlık oluştur."
                : "Adımları tamamladıkça ilerleme güncellenir."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>Zaman kazanıyorsun</span>
          <span className="hidden sm:inline">·</span>
          <span>Daha fazla kişiye ulaşıyorsun</span>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Progress value={pct} />
        <ul className="grid gap-2 sm:grid-cols-3">
          {steps.map((s) => {
            const done = activation[s.key];
            return (
              <li
                key={s.key}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                  done ? "border-primary/30 bg-primary/5 text-foreground" : "border-border bg-muted/30 text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                    done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
                  )}
                  aria-hidden
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : " "}
                </span>
                <span className={cn("font-medium", done && "text-foreground")}>{s.label}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
