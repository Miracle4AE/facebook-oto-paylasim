import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  ArrowRight,
  CreditCard,
  ScrollText,
  Shield,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdminDashboardStats } from "@/services/admin/admin-stats.service";

export default async function AdminDashboardPage() {
  const s = await getAdminDashboardStats();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Yönetim özeti
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Admin kontrol paneli</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Kullanıcılar, paylaşımlar ve entegrasyon sağlığı — tek ekranda.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/admin/kullanicilar/yeni" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Yeni kullanıcı
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/kullanicilar">Kullanıcıları görüntüle</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Toplam kullanıcı</CardDescription>
            <CardTitle className="text-3xl">{s.totalUsers}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Arşivlenmemiş kayıtlar</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Aktif kullanıcı</CardDescription>
            <CardTitle className="text-3xl">{s.activeUsers}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Girişe açık hesaplar</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pasif kullanıcı</CardDescription>
            <CardTitle className="text-3xl">{s.passiveUsers}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Devre dışı bırakılmış</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Facebook bağlantılı</CardDescription>
            <CardTitle className="text-3xl">{s.usersWithFacebook}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Aktif FB hesabı olan</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Bugün paylaşım (toplam)</CardDescription>
            <CardTitle className="text-3xl">{s.todayPublishTotal}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Log kayıtları</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Başarılı</CardDescription>
            <CardTitle className="text-3xl text-emerald-600">{s.todayPublishSuccess}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Bugün</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Hatalı</CardDescription>
            <CardTitle className="text-3xl text-amber-700">{s.todayPublishFailed}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Bugün</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Sorunlu entegrasyon</CardDescription>
            <CardTitle className="text-3xl">{s.problematicIntegrations}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Süresi dolmuş veya pasif token</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Son 7 günlük paylaşım özeti</CardTitle>
          <CardDescription>Günlük toplam / başarılı / hatalı</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {s.last7Days.map((d) => (
              <div
                key={d.dayLabel}
                className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-center text-xs"
              >
                <div className="font-medium text-foreground">{d.dayLabel}</div>
                <div className="mt-1 text-muted-foreground">
                  {d.total} / <span className="text-emerald-600">{d.success}</span> /{" "}
                  <span className="text-amber-700">{d.failed}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Son eklenen kullanıcılar</CardTitle>
              <CardDescription>En yeni kayıtlar</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/kullanicilar" className="gap-1">
                Tümü
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {s.recentUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Kayıt yok.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ad</TableHead>
                    <TableHead>E-posta</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead className="text-right">Tarih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {s.recentUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell>{u.role === "ADMIN" ? "Yönetici" : "Kullanıcı"}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {format(u.createdAt, "d MMM yyyy", { locale: tr })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Son hata logları</CardTitle>
              <CardDescription>Yayın hataları</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/loglar" className="gap-1">
                Loglar
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {s.recentErrorLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Son hata yok.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {s.recentErrorLogs.map((l) => (
                  <li key={l.id} className="rounded-md border border-border/50 bg-muted/10 px-3 py-2">
                    <div className="flex justify-between gap-2 text-xs text-muted-foreground">
                      <span>{l.userEmail ?? "—"}</span>
                      <span>{format(l.createdAt, "d MMM HH:mm", { locale: tr })}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-foreground">{l.message ?? "Hata"}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aboneliği yakında bitecek kullanıcılar</CardTitle>
          <CardDescription>Önümüzdeki 14 gün içinde bitiş</CardDescription>
        </CardHeader>
        <CardContent>
          {s.expiringSubscriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Yaklaşan bitiş yok.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kullanıcı</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Bitiş</TableHead>
                  <TableHead className="text-right">Kalan gün</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {s.expiringSubscriptions.map((r) => (
                  <TableRow key={r.userId}>
                    <TableCell>
                      <Link href={`/admin/kullanicilar/${r.userId}`} className="font-medium text-primary hover:underline">
                        {r.name ?? r.email}
                      </Link>
                    </TableCell>
                    <TableCell>{r.planName}</TableCell>
                    <TableCell>{format(r.endAt, "d MMMM yyyy", { locale: tr })}</TableCell>
                    <TableCell className="text-right">{r.daysLeft}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Button variant="secondary" className="h-auto justify-between py-4" asChild>
          <Link href="/admin/kullanicilar/yeni">
            <span className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Yeni kullanıcı oluştur
            </span>
            <ArrowRight className="h-4 w-4 opacity-60" />
          </Link>
        </Button>
        <Button variant="secondary" className="h-auto justify-between py-4" asChild>
          <Link href="/admin/kullanicilar">
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Kullanıcıları görüntüle
            </span>
            <ArrowRight className="h-4 w-4 opacity-60" />
          </Link>
        </Button>
        <Button variant="secondary" className="h-auto justify-between py-4" asChild>
          <Link href="/admin/loglar">
            <span className="flex items-center gap-2">
              <ScrollText className="h-4 w-4" />
              Logları görüntüle
            </span>
            <ArrowRight className="h-4 w-4 opacity-60" />
          </Link>
        </Button>
        <Button variant="secondary" className="h-auto justify-between py-4" asChild>
          <Link href="/admin/abonelikler">
            <span className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Abonelikleri yönet
            </span>
            <ArrowRight className="h-4 w-4 opacity-60" />
          </Link>
        </Button>
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Shield className="h-3.5 w-3.5" />
        Tüm admin işlemleri denetim kaydına alınır; hassas veriler loglanmaz.
      </p>
    </div>
  );
}
