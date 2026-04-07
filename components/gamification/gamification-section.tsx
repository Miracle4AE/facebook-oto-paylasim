"use client";

import { Award, Target, Zap } from "lucide-react";
import type { GamificationSnapshot } from "@/lib/gamification";
import { XP_PER_SHARE_ACTION } from "@/lib/gamification";
import { GamificationMilestoneModal } from "@/components/gamification/gamification-milestone-modal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type Props = {
  gamification: GamificationSnapshot;
};

export function GamificationSection({ gamification }: Props) {
  const pct =
    gamification.weeklyGoalTarget <= 0
      ? 0
      : Math.min(100, Math.round((gamification.weeklyGoalProgress / gamification.weeklyGoalTarget) * 100));

  return (
    <>
      <GamificationMilestoneModal streakDays={gamification.streakDays} />
      <Card className="border-border/70 bg-muted/10">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardDescription className="text-xs font-medium uppercase tracking-wide">İlerleme</CardDescription>
              <CardTitle className="text-base font-semibold">Rozetler &amp; haftalık hedef</CardTitle>
            </div>
            <div
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-medium tabular-nums text-muted-foreground"
              title={`Her paylaşım işlemi +${XP_PER_SHARE_ACTION} XP`}
            >
              <Zap className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden />
              {gamification.xpTotal} XP
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {gamification.badges.map(({ def, unlocked }) => (
              <span
                key={def.id}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  unlocked
                    ? "border-primary/35 bg-primary/10 text-foreground"
                    : "border-border bg-muted/40 text-muted-foreground",
                )}
                title={unlocked ? def.title : `${def.minDays} gün seri — ${def.title}`}
              >
                <Award className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                <span className="max-w-[9rem] truncate">{def.title}</span>
                {!unlocked && <span className="tabular-nums opacity-70">{def.minDays}g</span>}
              </span>
            ))}
          </div>

          {gamification.nextBadge && (
            <p className="text-xs text-muted-foreground">
              Sonraki rozet: <span className="font-medium text-foreground">{gamification.nextBadge.title}</span> — yaklaşık{" "}
              <span className="tabular-nums">{gamification.nextBadge.daysNeeded}</span> gün.
            </p>
          )}

          <div className="space-y-2 rounded-lg border border-border/60 bg-background/60 p-3">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Target className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                Bu hafta gruba ulaş
              </span>
              <span className="tabular-nums text-xs font-medium text-foreground">
                {gamification.weeklyGoalProgress} / {gamification.weeklyGoalTarget}
              </span>
            </div>
            <Progress value={pct} />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Bu hafta paylaşım yaptığın farklı grup sayısı. Hedef, hedeflerine göre otomatik ölçeklenir — küçük adımlar
              yeterli.
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
