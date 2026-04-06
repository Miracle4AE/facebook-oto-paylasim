"use client";

import { LogOut, Menu, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AdminSidebar } from "@/components/admin/panel/admin-sidebar";

type Props = {
  user: { name?: string | null; email?: string | null };
};

export function AdminTopbar({ user }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    setMobileNav(false);
  }, [pathname]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    router.push(`/admin/kullanicilar?q=${encodeURIComponent(term)}`);
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-background/85 px-4 backdrop-blur lg:px-6">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Menü"
          onClick={() => setMobileNav((v) => !v)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <form onSubmit={submitSearch} className="relative mx-auto max-w-xl flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Kullanıcı ara (ad veya e-posta)…"
            className="h-10 border-border/70 pl-9"
            aria-label="Hızlı arama"
          />
        </form>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="hidden shrink-0 sm:inline-flex">
              {user.name ?? user.email ?? "Hesap"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard">Müşteri paneline geç</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                void signOut({ callbackUrl: "/admin/login" });
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Çıkış yap
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shrink-0 sm:hidden"
          onClick={() => {
            void signOut({ callbackUrl: "/admin/login" });
          }}
        >
          Çıkış
        </Button>
      </header>

      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden",
          mobileNav ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setMobileNav(false)}
        aria-hidden
      />
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 border-r border-border/60 bg-card shadow-panel transition-transform lg:hidden",
          mobileNav ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="max-h-screen overflow-y-auto p-4">
          <AdminSidebar />
        </div>
      </div>
    </>
  );
}
