"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";
import {
  archiveUserAdminAction,
  rotateTempPasswordAdminAction,
  setUserActiveAdminAction,
} from "@/actions/admin-users";
import type { AdminUserTableRow } from "@/services/admin/user-admin-list.service";
import type { AdminUserListParams } from "@/services/admin/user-admin-list.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserRole } from "@/types/domain";
import { toast } from "sonner";
import { MoreHorizontal, UserPlus } from "lucide-react";
import { useState } from "react";

type PlanOption = { id: string; code: string; name: string };

type Props = {
  initialRows: AdminUserTableRow[];
  total: number;
  params: AdminUserListParams;
  plans: PlanOption[];
  currentUserId: string;
};

function formatDt(d: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(d));
}

function buildQuery(next: Partial<AdminUserListParams & { page?: number }>, base: AdminUserListParams) {
  const p = { ...base, ...next };
  const qs = new URLSearchParams();
  if (p.q) qs.set("q", p.q);
  if (p.role) qs.set("role", p.role);
  if (p.active && p.active !== "all") qs.set("active", p.active);
  if (p.facebook && p.facebook !== "all") qs.set("facebook", p.facebook);
  if (p.planCode) qs.set("plan", p.planCode);
  if (p.includeArchived) qs.set("archived", "1");
  qs.set("sort", p.sortBy);
  qs.set("dir", p.sortDir);
  qs.set("page", String(next.page ?? p.page ?? 1));
  qs.set("pageSize", String(p.pageSize));
  return `/admin/kullanicilar?${qs.toString()}`;
}

export function AdminUsersPageClient({ initialRows, total, params, plans, currentUserId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [archiveId, setArchiveId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));

  const navigate = useCallback(
    (patch: Partial<AdminUserListParams & { page?: number }>) => {
      startTransition(() => {
        router.push(buildQuery(patch, { ...params, ...patch }));
      });
    },
    [router, params],
  );

  async function onToggleActive(u: AdminUserTableRow, next: boolean) {
    if (u.id === currentUserId && !next) {
      toast.error("Kendi hesabınızı pasif yapamazsınız");
      return;
    }
    const res = await setUserActiveAdminAction(u.id, next);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(next ? "Hesap aktifleştirildi" : "Hesap pasifleştirildi");
    router.refresh();
  }

  async function onRotatePassword(userId: string) {
    const res = await rotateTempPasswordAdminAction(userId);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    await navigator.clipboard.writeText(res.password);
    toast.success("Yeni geçici şifre panoya kopyalandı (yalnızca siz görürsünüz).");
    router.refresh();
  }

  async function confirmArchive() {
    if (!archiveId) return;
    const res = await archiveUserAdminAction(archiveId);
    setArchiveId(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Kullanıcı arşivlendi");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Kullanıcılar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Toplam {total} kayıt · Sayfa {params.page} / {totalPages}
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/admin/kullanicilar/yeni">
            <UserPlus className="h-4 w-4" />
            Yeni kullanıcı
          </Link>
        </Button>
      </div>

      <Card className="border-border/70 shadow-soft">
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <div className="space-y-1">
              <Label htmlFor="q">Arama</Label>
              <Input
                id="q"
                defaultValue={params.q ?? ""}
                placeholder="Ad veya e-posta"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const v = (e.target as HTMLInputElement).value.trim();
                    navigate({ q: v || undefined, page: 1 });
                  }
                }}
              />
            </div>
            <div className="space-y-1">
              <Label>Durum</Label>
              <Select
                value={params.active ?? "all"}
                onValueChange={(v) => navigate({ active: v as AdminUserListParams["active"], page: 1 })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="passive">Pasif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Rol</Label>
              <Select
                value={params.role || "all"}
                onValueChange={(v) =>
                  navigate({
                    role: v === "all" ? "" : (v as "ADMIN" | "USER"),
                    page: 1,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="ADMIN">Yönetici</SelectItem>
                  <SelectItem value="USER">Kullanıcı</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Facebook</Label>
              <Select
                value={params.facebook ?? "all"}
                onValueChange={(v) => navigate({ facebook: v as AdminUserListParams["facebook"], page: 1 })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="yes">Bağlı</SelectItem>
                  <SelectItem value="no">Yok</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Plan</Label>
              <Select
                value={params.planCode ?? "all"}
                onValueChange={(v) => navigate({ planCode: v === "all" ? undefined : v, page: 1 })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.code}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Arşiv</Label>
              <Select
                value={params.includeArchived ? "1" : "0"}
                onValueChange={(v) => navigate({ includeArchived: v === "1", page: 1 })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Arşiv hariç</SelectItem>
                  <SelectItem value="1">Arşiv dahil</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Sırala:</span>
            <Button
              type="button"
              size="sm"
              variant={params.sortBy === "createdAt" ? "secondary" : "outline"}
              onClick={() => navigate({ sortBy: "createdAt", page: 1 })}
            >
              Oluşturma
            </Button>
            <Button
              type="button"
              size="sm"
              variant={params.sortBy === "lastLoginAt" ? "secondary" : "outline"}
              onClick={() => navigate({ sortBy: "lastLoginAt", page: 1 })}
            >
              Son giriş
            </Button>
            <Button
              type="button"
              size="sm"
              variant={params.sortBy === "publishCount" ? "secondary" : "outline"}
              onClick={() => navigate({ sortBy: "publishCount", page: 1 })}
            >
              Paylaşım sayısı
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => navigate({ sortDir: params.sortDir === "asc" ? "desc" : "asc" })}
            >
              Yön: {params.sortDir === "asc" ? "Artan" : "Azalan"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-soft">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Ad soyad</TableHead>
                  <TableHead>E-posta</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Facebook</TableHead>
                  <TableHead>Oluşturma</TableHead>
                  <TableHead>Son giriş</TableHead>
                  <TableHead className="text-right">Paylaşım</TableHead>
                  <TableHead className="text-right w-[120px]">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-12 text-center text-sm text-muted-foreground">
                      Sonuç bulunamadı.
                    </TableCell>
                  </TableRow>
                ) : (
                  initialRows.map((u) => {
                    const isSelf = u.id === currentUserId;
                    const disableDeactivate = isSelf;
                    return (
                      <TableRow key={u.id} className={pending ? "opacity-70" : undefined}>
                        <TableCell className="font-medium">{u.name ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell>
                          {u.role === UserRole.ADMIN ? (
                            <Badge className="bg-primary/90">Yönetici</Badge>
                          ) : (
                            <Badge variant="secondary">Kullanıcı</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            {u.archivedAt ? (
                              <Badge variant="outline">Arşiv</Badge>
                            ) : u.isActive ? (
                              <Badge variant="outline" className="border-emerald-500/40 text-emerald-600">
                                Aktif
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-amber-500/40 text-amber-700">
                                Pasif
                              </Badge>
                            )}
                            {!u.archivedAt ? (
                              <button
                                type="button"
                                className="text-xs text-primary underline-offset-4 hover:underline"
                                disabled={disableDeactivate && u.isActive}
                                onClick={() => void onToggleActive(u, !u.isActive)}
                              >
                                {u.isActive ? "Pasifleştir" : "Aktifleştir"}
                              </button>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{u.planName ?? "—"}</TableCell>
                        <TableCell>{u.hasFacebook ? "Var" : "Yok"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDt(u.createdAt)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {u.lastLoginAt ? formatDt(u.lastLoginAt) : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{u.publishCount}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" variant="ghost" size="icon" aria-label="İşlemler">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/kullanicilar/${u.id}`}>Görüntüle</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/kullanicilar/${u.id}?edit=1`}>Düzenle</Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                disabled={isSelf}
                                onSelect={() => void onRotatePassword(u.id)}
                              >
                                Yeni geçici şifre üret
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={isSelf}
                                className="text-amber-700 focus:text-amber-800"
                                onSelect={() => setArchiveId(u.id)}
                              >
                                Hesabı arşivle
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={params.page <= 1}
            onClick={() => navigate({ page: params.page - 1 })}
          >
            Önceki
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={params.page >= totalPages}
            onClick={() => navigate({ page: params.page + 1 })}
          >
            Sonraki
          </Button>
        </div>
      </div>

      <AlertDialog open={archiveId !== null} onOpenChange={(o) => !o && setArchiveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kullanıcıyı arşivlemek istiyor musunuz?</AlertDialogTitle>
            <AlertDialogDescription>
              Hesap girişe kapanır ve listelerde arşiv olarak işaretlenir. Bu işlem geri alınabilir (veritabanından).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmArchive()}>Arşivle</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
