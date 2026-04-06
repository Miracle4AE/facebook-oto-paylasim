import Link from "next/link";
import { getServerSession } from "next-auth";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { PublishLogStatusBadge } from "@/components/common/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { History } from "lucide-react";

type SearchParams = { durum?: string; sort?: string };

export default async function HistoryPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const durum = searchParams.durum;
  const sort = searchParams.sort === "asc" ? "asc" : "desc";

  const logs = await prisma.publishLog.findMany({
    where: {
      contentPost: { userId: session.user.id },
      ...(durum && durum !== "ALL" ? { status: durum } : {}),
    },
    orderBy: { createdAt: sort },
    include: { contentPost: true, targetChannel: true },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Paylaşım geçmişi</h1>
          <p className="mt-2 text-sm text-muted-foreground">Gönderim logları, hata mesajları ve sıralama.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant={!durum || durum === "ALL" ? "default" : "outline"} size="sm">
            <Link href="/gecmis">Tümü</Link>
          </Button>
          <Button asChild variant={durum === "SUCCESS" ? "default" : "outline"} size="sm">
            <Link href="/gecmis?durum=SUCCESS">Başarılı</Link>
          </Button>
          <Button asChild variant={durum === "FAILED" ? "default" : "outline"} size="sm">
            <Link href="/gecmis?durum=FAILED">Başarısız</Link>
          </Button>
          <Button asChild variant={sort === "desc" ? "default" : "outline"} size="sm">
            <Link href={`/gecmis?${new URLSearchParams({ ...(durum && durum !== "ALL" ? { durum } : {}), sort: "desc" }).toString()}`}>
              Yeni → eski
            </Link>
          </Button>
          <Button asChild variant={sort === "asc" ? "default" : "outline"} size="sm">
            <Link href={`/gecmis?${new URLSearchParams({ ...(durum && durum !== "ALL" ? { durum } : {}), sort: "asc" }).toString()}`}>
              Eski → yeni
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Kayıtlar</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <EmptyState icon={History} title="Kayıt yok" description="Henüz log bulunmuyor." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>İçerik</TableHead>
                  <TableHead>Hedef</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Mesaj</TableHead>
                  <TableHead className="text-right">Zaman</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.contentPost.title ?? "Başlıksız"}</TableCell>
                    <TableCell>{log.targetChannel.name}</TableCell>
                    <TableCell>
                      <PublishLogStatusBadge status={log.status} />
                    </TableCell>
                    <TableCell className="max-w-[280px] truncate text-xs text-muted-foreground">
                      {log.errorDetail ?? log.message ?? "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {format(log.createdAt, "d MMM yyyy HH:mm:ss", { locale: tr })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
