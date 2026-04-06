"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { adminNavItem, mainNav } from "@/components/layout/nav";
import { UserRole } from "@/types/domain";

type NavLink = { href: string; label: string; icon: LucideIcon };

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === UserRole.ADMIN;

  const links: NavLink[] = useMemo(() => {
    const base: NavLink[] = [...mainNav];
    if (isAdmin) {
      base.push(adminNavItem);
    }
    return base;
  }, [isAdmin]);

  return (
    <aside className="hidden w-72 shrink-0 border-r border-border/60 bg-gradient-to-b from-card/80 to-background/40 p-4 lg:block">
      <div className="mb-8 px-2">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Yönetim</div>
        <div className="mt-1 text-lg font-semibold">Paylaşım Paneli</div>
      </div>
      <nav className="space-y-1">
        {links.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
