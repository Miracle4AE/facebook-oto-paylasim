"use client";

import type { LucideIcon } from "lucide-react";
import {
  CreditCard,
  LayoutDashboard,
  ScrollText,
  Settings,
  Shield,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin", label: "Özet", icon: LayoutDashboard },
  { href: "/admin/kullanicilar", label: "Kullanıcılar", icon: Users },
  { href: "/admin/abonelikler", label: "Abonelikler", icon: CreditCard },
  { href: "/admin/odemeler", label: "Ödemeler", icon: Wallet },
  { href: "/admin/loglar", label: "Loglar", icon: ScrollText },
  { href: "/admin/ayarlar", label: "Ayarlar", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-border/60 bg-gradient-to-b from-card/80 to-background/40 p-4 lg:block">
      <div className="mb-8 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Yönetim</div>
          <div className="text-sm font-semibold">Admin Paneli</div>
        </div>
      </div>
      <nav className="space-y-1">
        {items.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/15 text-primary shadow-soft"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
