import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { ArrowRight, Sparkles } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getActivationMilestones } from "@/lib/activation-state";
import { getDashboardStats } from "@/lib/dashboard-stats";
import { getHabitLoopSnapshot } from "@/lib/habit-loop-stats";
import { buildGamificationSnapshot } from "@/lib/gamification";
import { getBillingDashboardDTO } from "@/services/billing/entitlements.service";
import { getActiveGroupTargetsForUser } from "@/services/targets/group-targets.service";
import { ActivationDashboardClient } from "@/components/activation/activation-dashboard-client";
import { HabitLoopSection } from "@/components/habit/habit-loop-section";
import { GamificationSection } from "@/components/gamification/gamification-section";
import { DashboardUpgradeBanner } from "@/components/billing/dashboard-upgrade-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PublishLogStatusBadge } from "@/components/common/status-badge";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const userId = session.user.id;
  const [stats, activation, groupTargets, habit] = await Promise.all([
    getDashboardStats(userId),
    getActivationMilestones(userId),
    getActiveGroupTargetsForUser(userId),
    getHabitLoopSnapshot(userId),
  ]);

  const billing = await getBillingDashboardDTO(userId, {
    todayDistinctGroups: habit.todayDistinctGroups,
    didShareToday: habit.didShareToday,
  });

  const gamification = buildGamificationSnapshot(habit, groupTargets.length);

  return (
    <ActivationDashboardClient
      activation={activation}
      groupTargets={groupTargets.map((g) => ({ id: g.id, name: g.name }))}
    >
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-primary">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              Zaman kazandırır
            </span>
            <span className="hidden sm:inline">·</span>
            <span>Daha fazla kişiye ulaş</span>
            <span className="hidden sm:inline">·</span>
            <span>Spam gibi görünmez</span>
          </div>
          <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight lg:text-4xl">
            1 saatte yapılacak işi 10 dakikada bitir
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            İçerik, hedef ve grup paylaşımını tek yerden yönetin; tekrarlayan işleri azaltın, sonucu hızlı görün.
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

      <DashboardUpgradeBanner billing={billing} />

      <HabitLoopSection habit={habit} />

      <GamificationSection gamification={gamification} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Aktif hedef kanal</CardDescription>
            <CardTitle className="text-3xl">{stats.activeTargets}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Tek ekrandan erişilebilir kanallar</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Planlanan içerik</CardDescription>
            <CardTitle className="text-3xl">{stats.scheduledContents}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Hazır içerik = daha az bekleme</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Bugünkü kuyruk</CardDescription>
            <CardTitle className="text-3xl">{stats.pendingToday}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Bugün sıradaki fırsatlar</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Başarı / başarısız</CardDescription>
            <CardTitle className="text-3xl">
              {stats.successLogs} / {stats.failedLogs}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Ne işe yaradığını net görün</CardContent>
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
              <p className="text-sm leading-relaxed text-muted-foreground">
                İlk paylaşımını yap ve farkı gör.{" "}
                <Link href="/icerikler/yeni" className="font-medium text-primary underline underline-offset-4">
                  İçerik oluştur
                </Link>{" "}
                veya{" "}
                <Link href="/hedefler" className="font-medium text-primary underline underline-offset-4">
                  hedef ekle
                </Link>
                .
              </p>
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
    </ActivationDashboardClient>
  );
}
