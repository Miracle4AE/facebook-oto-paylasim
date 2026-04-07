"use client";

import Link from "next/link";
import { Flame, LayoutGrid, Sparkles, TrendingUp } from "lucide-react";
import type { HabitLoopSnapshot } from "@/lib/habit-loop-stats";
import { useActivationQuickStart } from "@/components/activation/activation-quick-actions-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  habit: HabitLoopSnapshot;
};

function padHour(h: number): string {
  return `${h.toString().padStart(2, "0")}:00`;
}

export function HabitLoopSection({ habit }: Props) {
  const quick = useActivationQuickStart();

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card
        className={cn(
          "border-border/80 lg:col-span-2",
          !habit.didShareToday && "border-muted-foreground/20 bg-muted/20",
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardDescription className="text-xs font-medium uppercase tracking-wide">Günlük alışkanlık</CardDescription>
              <CardTitle className="mt-1 text-lg font-semibold sm:text-xl">Bugün paylaşım yaptın mı?</CardTitle>
            </div>
            {habit.streakDays >= 1 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-800 dark:text-orange-200">
                <Flame className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {habit.streakDays === 1
                  ? "1 gündür aktifsin"
                  : `${habit.streakDays} gündür aktifsin`}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {habit.didShareToday ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              Bugün için paylaşım kaydı var. İstersen yeni içerik veya ek grup paylaşımı ekleyebilirsin.
            </p>
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground">
              Henüz bugün için paylaşım kaydı yok. Kısa bir akışla devam et; alışkanlık küçük adımlarla güçlenir.
              {habit.streakDays >= 1 && (
                <span className="mt-1 block text-foreground/90">
                  Seriyi korumak için bugün de bir adım yeterli.
                </span>
              )}
            </p>
          )}

          {habit.showTimeWindowHint && habit.usualShareHourLocal !== null && (
            <p className="rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-xs text-muted-foreground">
              Genelde <span className="font-medium text-foreground">{padHour(habit.usualShareHourLocal)}</span> civarı
              paylaşıyorsun — bugün de sıradakini yapabilirsin.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {quick ? (
              <Button type="button" size="lg" className="gap-2" onClick={() => quick.openQuickStart()}>
                <Sparkles className="h-4 w-4" />
                Hızlı paylaşımı başlat
              </Button>
            ) : (
              <Button size="lg" className="gap-2" asChild>
                <Link href="/icerikler">
                  <Sparkles className="h-4 w-4" />
                  İçeriklere git
                </Link>
              </Button>
            )}
            <Button variant="outline" size="lg" asChild>
              <Link href="/icerikler/yeni">Yeni içerik</Link>
            </Button>
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">{habit.motivationLine}</p>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader className="pb-2">
          <CardDescription className="text-xs font-medium uppercase tracking-wide">Özet</CardDescription>
          <CardTitle className="text-base font-semibold">Bu hafta &amp; toplam</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
            <span className="flex items-center gap-2 text-muted-foreground">
              <LayoutGrid className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
              Bugün (grup)
            </span>
            <span className="font-semibold tabular-nums">{habit.todayDistinctGroups}</span>
          </div>
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
            <span className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
              Bu hafta paylaşım
            </span>
            <span className="font-semibold tabular-nums">{habit.weekShareActions}</span>
          </div>
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
            <span className="text-muted-foreground">Toplam işlem</span>
            <span className="font-semibold tabular-nums">{habit.totalShareActions}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            İşlem: başarılı yayın + tamamlanan grup paylaşım adımları. Seri, takvim gününe göre hesaplanır (
            {habit.timezone}).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
