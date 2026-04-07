"use client";

import { useEffect, useMemo, useState } from "react";
import { Award } from "lucide-react";
import type { BadgeId } from "@/lib/gamification";
import { STREAK_BADGES, getCongratsCopy } from "@/lib/gamification";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const LS_KEY = "gamification-seen-badges-v1";

function readSeen(): Set<BadgeId> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    const out = new Set<BadgeId>();
    for (const x of parsed) {
      if (typeof x === "string") out.add(x as BadgeId);
    }
    return out;
  } catch {
    return new Set();
  }
}

function writeSeen(ids: Set<BadgeId>): void {
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    /* ignore */
  }
}

type Props = {
  streakDays: number;
};

export function GamificationMilestoneModal({ streakDays }: Props) {
  const [open, setOpen] = useState(false);

  const pendingBadge = useMemo(() => {
    const unlocked = STREAK_BADGES.filter((b) => streakDays >= b.minDays);
    if (unlocked.length === 0) return null;
    return unlocked[unlocked.length - 1];
  }, [streakDays]);

  useEffect(() => {
    if (!pendingBadge) return;
    const seen = readSeen();
    if (seen.has(pendingBadge.id)) return;
    setOpen(true);
  }, [pendingBadge]);

  function handleClose() {
    if (pendingBadge) {
      const seen = readSeen();
      const unlocked = STREAK_BADGES.filter((b) => streakDays >= b.minDays);
      for (const b of unlocked) seen.add(b.id);
      writeSeen(seen);
    }
    setOpen(false);
  }

  if (!pendingBadge) return null;

  const body = getCongratsCopy(streakDays, pendingBadge.title);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className={cn(
          "max-w-sm border-border/80 text-center sm:max-w-md",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:duration-200",
        )}
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/12">
          <Award className="h-7 w-7 text-primary" aria-hidden />
        </div>
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl">Yeni rozet</DialogTitle>
          <DialogDescription asChild>
            <p className="text-base leading-relaxed text-foreground/90">{body}</p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button type="button" onClick={handleClose}>
            Süper
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
