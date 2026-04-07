import Link from "next/link";
import { getServerSession } from "next-auth";
import { formatDateTimeShort } from "@/lib/format-datetime";
import { Eye, Pencil, Plus } from "lucide-react";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { ContentStatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/common/empty-state";
import { Share2 } from "lucide-react";

export default async function ContentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const posts = await prisma.contentPost.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: { mediaFiles: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">İçerikler</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Bir metin yazın; detayda aynı içeriği çok gruba dakikalar içinde taşıyın — zaman kazandırır, daha fazla kişiye
            ulaşırsınız.
          </p>
        </div>
        <Button asChild>
          <Link href="/icerikler/yeni">
            <Plus className="mr-2 h-4 w-4" />
            Yeni içerik
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Liste</CardTitle>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <EmptyState
              icon={Share2}
              title="İlk paylaşımını yap ve farkı gör"
              description="Yeni bir metin oluşturun; gruplarda tek akışla aynı içeriği çok kanala taşıyın. Önce hedef ekleyebilir veya doğrudan içerikle başlayabilirsiniz."
              action={
                <div className="flex flex-col items-center gap-3 sm:flex-row">
                  <Button asChild>
                    <Link href="/icerikler/yeni">İçerik oluştur</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/hedefler">Önce grup ekle</Link>
                  </Button>
                </div>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Başlık</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Medya</TableHead>
                  <TableHead className="text-right w-[260px]">İşlemler</TableHead>
                  <TableHead className="text-right">Güncelleme</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium">{p.title ?? "Başlıksız"}</div>
                      <div className="line-clamp-2 text-xs text-muted-foreground">{p.body}</div>
                    </TableCell>
                    <TableCell>
                      <ContentStatusBadge status={p.status} />
                    </TableCell>
                    <TableCell>{p.mediaFiles.length} dosya</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/icerikler/${p.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Görüntüle
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/icerikler/${p.id}/duzenle`}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Düzenle
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {formatDateTimeShort(p.updatedAt)}
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
