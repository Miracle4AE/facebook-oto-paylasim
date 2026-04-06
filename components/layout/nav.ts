import {
  CalendarClock,
  History,
  LayoutDashboard,
  Link2,
  Settings,
  Share2,
  Target,
  Users,
} from "lucide-react";

export const mainNav = [
  { href: "/dashboard", label: "Kontrol Paneli", icon: LayoutDashboard },
  { href: "/entegrasyon", label: "Entegrasyon", icon: Link2 },
  { href: "/hedefler", label: "Hedefler", icon: Target },
  { href: "/icerikler", label: "İçerikler", icon: Share2 },
  { href: "/zamanlama", label: "Zamanlama", icon: CalendarClock },
  { href: "/gecmis", label: "Geçmiş", icon: History },
  { href: "/ayarlar", label: "Ayarlar", icon: Settings },
] as const;

/** Yalnızca ADMIN rolüne gösterilir */
export const adminNavItem = {
  href: "/admin",
  label: "Yönetim paneli",
  icon: Users,
} as const;
