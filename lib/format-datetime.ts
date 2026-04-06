import { format } from "date-fns";
import { tr } from "date-fns/locale";

/** Detay sayfaları ve tam tarih gerektiren yerler (örn. 6 Nisan 2025 · 14:30) */
export function formatDateTimeLong(date: Date): string {
  return format(date, "d MMMM yyyy · HH:mm", { locale: tr });
}

/** Liste ve kompakt gösterim (örn. 6 Nis 2025 · 14:30) */
export function formatDateTimeShort(date: Date): string {
  return format(date, "d MMM yyyy · HH:mm", { locale: tr });
}
