"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useMemo } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { adminNavItem, mainNav } from "@/components/layout/nav";
import { useUiStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";
import { UserRole } from "@/types/domain";

type NavLink = { href: string; label: string; icon: LucideIcon };

type Props = {
  user: { name?: string | null; email?: string | null };
};

export function Topbar({ user }: Props) {
  const { sidebarOpen, setSidebarOpen } = useUiStore();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === UserRole.ADMIN;

  const mobileLinks: NavLink[] = useMemo(() => {
    const base: NavLink[] = [...mainNav];
    if (isAdmin) base.push(adminNavItem);
    return base;
  }, [isAdmin]);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur lg:px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Menüyü aç"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="hidden flex-col sm:flex">
            <span className="text-sm text-muted-foreground">Hoş geldiniz</span>
            <span className="font-semibold leading-tight">{user.name ?? user.email}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Hesap
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/ayarlar">Ayarlar</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  void signOut({ callbackUrl: "/login" });
                }}
              >
                Çıkış yap
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden",
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setSidebarOpen(false)}
        aria-hidden
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 border-r border-border/60 bg-card p-4 shadow-panel transition-transform lg:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-6 px-2">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Menü</div>
          <div className="mt-1 text-lg font-semibold">Paylaşım Paneli</div>
        </div>
        <nav className="space-y-1">
          {mobileLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
