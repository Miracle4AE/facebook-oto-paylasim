import type { HabitLoopSnapshot } from "@/types/habit-loop";

/** Her anlamlı paylaşım işlemi için XP (basit, şeffaf) */
export const XP_PER_SHARE_ACTION = 8;

export const BadgeId = {
  STREAK_1: "STREAK_1",
  STREAK_3: "STREAK_3",
  STREAK_7: "STREAK_7",
  STREAK_14: "STREAK_14",
  STREAK_30: "STREAK_30",
} as const;
export type BadgeId = (typeof BadgeId)[keyof typeof BadgeId];

export type StreakBadgeDef = {
  id: BadgeId;
  minDays: number;
  title: string;
};

export const STREAK_BADGES: readonly StreakBadgeDef[] = [
  { id: BadgeId.STREAK_1, minDays: 1, title: "Başladın" },
  { id: BadgeId.STREAK_3, minDays: 3, title: "Devam ediyorsun" },
  { id: BadgeId.STREAK_7, minDays: 7, title: "İstikrarlısın" },
  { id: BadgeId.STREAK_14, minDays: 14, title: "Ciddileştin" },
  { id: BadgeId.STREAK_30, minDays: 30, title: "Profesyonel" },
] as const;

export type GamificationSnapshot = {
  xpTotal: number;
  weeklyGoalProgress: number;
  weeklyGoalTarget: number;
  streakDays: number;
  badges: { def: StreakBadgeDef; unlocked: boolean }[];
  /** Seride bir sonraki rozet için kalan gün (yoksa tümü açık) */
  nextBadge: { title: string; daysNeeded: number } | null;
};

function computeWeeklyGroupGoal(activeGroupCount: number, weekDistinctGroups: number): number {
  const floor = 25;
  const cap = 150;
  const fromTargets = Math.round(Math.min(cap, Math.max(floor, activeGroupCount * 5)));
  const stretch = Math.ceil(weekDistinctGroups * 1.15);
  const merged = Math.max(fromTargets, Math.min(cap, Math.max(floor, stretch)));
  return Math.min(cap, Math.max(floor, merged));
}

/**
 * Habit verisinden oyunlaştırma özeti — ek DB sorgusu yok.
 */
export function buildGamificationSnapshot(
  habit: HabitLoopSnapshot,
  activeGroupCount: number,
): GamificationSnapshot {
  const xpTotal = habit.totalShareActions * XP_PER_SHARE_ACTION;
  const weeklyGoalTarget = computeWeeklyGroupGoal(activeGroupCount, habit.weekDistinctGroups);
  const weeklyGoalProgress = habit.weekDistinctGroups;

  const streakDays = habit.streakDays;
  const badges = STREAK_BADGES.map((def) => ({
    def,
    unlocked: streakDays >= def.minDays,
  }));

  let nextBadge: GamificationSnapshot["nextBadge"] = null;
  for (const def of STREAK_BADGES) {
    if (streakDays < def.minDays) {
      nextBadge = { title: def.title, daysNeeded: def.minDays - streakDays };
      break;
    }
  }

  return {
    xpTotal,
    weeklyGoalProgress,
    weeklyGoalTarget,
    streakDays,
    badges,
    nextBadge,
  };
}

export function getCongratsCopy(streakDays: number, badgeTitle: string): string {
  if (streakDays >= 30) {
    return `${streakDays} gündür aktifsin — ${badgeTitle} rozeti senin. Böyle devam.`;
  }
  if (streakDays >= 14) {
    return `${streakDays} gündür aktifsin, harika gidiyorsun — ${badgeTitle}.`;
  }
  if (streakDays >= 7) {
    return `${streakDays} gündür aktifsin, harika gidiyorsun — ${badgeTitle}.`;
  }
  if (streakDays >= 3) {
    return `${streakDays} gündür üst üste paylaşım yaptın — ${badgeTitle}.`;
  }
  return `İlk serini başlattın — ${badgeTitle}.`;
}
