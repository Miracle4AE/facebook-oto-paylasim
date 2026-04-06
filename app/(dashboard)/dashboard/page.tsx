import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { ArrowRight, Sparkles } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getDashboardStats } from "@/lib/dashboard-stats";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PublishLogStatusBadge } from "@/components/common/status-badge";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const stats = await getDashboardStats(session.user.id);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Canlı zamanlama ve güvenli oturum
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Kontrol Paneli</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Hedeflerinizi, içeriklerinizi ve otomatik paylaşım performansını tek ekrandan yönetin.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/icerikler/yeni">Yeni içerik</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/zamanlama">Zamanlama</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Aktif hedef kanal</CardDescription>
            <CardTitle className="text-3xl">{stats.activeTargets}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Yayına açık hedefler</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Planlanan içerik</CardDescription>
            <CardTitle className="text-3xl">{stats.scheduledContents}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Zamanlamaya hazır gönderiler</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Bugünkü kuyruk</CardDescription>
            <CardTitle className="text-3xl">{stats.pendingToday}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Bugün işlenecek işler</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Başarı / başarısız</CardDescription>
            <CardTitle className="text-3xl">
              {stats.successLogs} / {stats.failedLogs}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Tüm zamanlar, log bazlı</CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Son paylaşımlar</CardTitle>
              <CardDescription>En güncel gönderim kayıtları</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/gecmis" className="gap-1">
                Tümü
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {stats.recentLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Henüz kayıt yok.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>İçerik</TableHead>
                    <TableHead>Hedef</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">Zaman</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.contentPost.title ?? "Başlıksız"}</TableCell>
                      <TableCell>{log.targetChannel.name}</TableCell>
                      <TableCell>
                        <PublishLogStatusBadge status={log.status} />
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {format(log.createdAt, "d MMM HH:mm", { locale: tr })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hızlı işlemler</CardTitle>
            <CardDescription>Sık kullanılan kısayollar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-between" variant="secondary" asChild>
              <Link href="/entegrasyon">
                Facebook bağlantısı
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button className="w-full justify-between" variant="secondary" asChild>
              <Link href="/hedefler">
                Hedef ekle
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button className="w-full justify-between" variant="secondary" asChild>
              <Link href="/icerikler/yeni">
                Taslak oluştur
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
