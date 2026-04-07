/**
 * Alışkanlık döngüsü anlık görüntüsü — Prisma’dan bağımsız (istemci `import type` ile güvenli).
 */
export type HabitLoopSnapshot = {
  timezone: string;
  didShareToday: boolean;
  streakDays: number;
  todayDistinctGroups: number;
  /** Bu hafta en az bir paylaşım dokunan farklı grup (hedef) sayısı */
  weekDistinctGroups: number;
  totalShareActions: number;
  weekShareActions: number;
  usualShareHourLocal: number | null;
  showTimeWindowHint: boolean;
  motivationLine: string;
};
