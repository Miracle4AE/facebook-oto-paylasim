import { formatDateTimeLong, formatDateTimeShort } from "@/lib/format-datetime";
import { cn } from "@/lib/utils";
import { CalendarClock, FileText, ListOrdered } from "lucide-react";
import { ContentStatusBadge, PublishJobStatusBadge } from "@/components/common/status-badge";
import { ContentDetailActions } from "@/components/content/content-detail-actions";
import { ContentDetailMediaGrid } from "@/components/content/content-detail-media-grid";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ContentPostDetail } from "@/services/content/content-detail.service";
import type { GroupTargetSummary } from "@/types/group-target";
import type { GroupTargetShareStat } from "@/types/group-share";
import { ContentGroupShareSection } from "@/components/content/content-group-share-section";

type Props = {
  detail: ContentPostDetail;
  groupTargets: GroupTargetSummary[];
  groupShareDraftByTargetId: Record<string, string>;
  groupShareStatsByTargetId: Record<string, GroupTargetShareStat>;
};

export function ContentDetailView({
  detail,
  groupTargets,
  groupShareDraftByTargetId,
  groupShareStatsByTargetId,
}: Props) {
  const hasTitle = Boolean(detail.title?.trim());
  const displayTitle = hasTitle ? detail.title!.trim() : "Başlıksız içerik";
  const created = formatDateTimeLong(detail.createdAt);
  const updated = formatDateTimeLong(detail.updatedAt);

  const mediaLabel = detail.media.length === 0 ? "Medya yok" : `${detail.media.length} dosya`;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 border-b border-border/60 pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <ContentStatusBadge status={detail.status} />
            <span className="text-sm text-muted-foreground">{mediaLabel}</span>
          </div>
          <h1
            className={cn(
              "text-balance text-3xl font-semibold tracking-tight",
              !hasTitle && "italic text-muted-foreground",
            )}
          >
            {displayTitle}
          </h1>
          <div className="flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-6">
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
              <span>
                Oluşturulma: <time dateTime={detail.createdAt.toISOString()}>{created}</time>
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <FileText className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
              <span>
                Güncellenme: <time dateTime={detail.updatedAt.toISOString()}>{updated}</time>
              </span>
            </span>
          </div>
        </div>
        <ContentDetailActions contentId={detail.id} displayTitle={displayTitle} status={detail.status} />
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Metin</CardTitle>
          <CardDescription>Paylaşım gövdesi</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[min(70vh,52rem)] overflow-y-auto rounded-lg border border-border/40 bg-muted/10 p-4 sm:p-5">
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
              {detail.body.trim().length === 0 ? (
                <span className="italic text-muted-foreground">Metin bulunmuyor.</span>
              ) : (
                detail.body
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      <ContentGroupShareSection
        key={detail.id}
        contentPostId={detail.id}
        groupTargets={groupTargets}
        initialDraftByTargetId={groupShareDraftByTargetId}
        statsByTargetId={groupShareStatsByTargetId}
        title={detail.title}
        body={detail.body}
      />

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ListOrdered className="h-5 w-5 text-muted-foreground" aria-hidden />
            <div>
              <CardTitle className="text-lg">Yayın görevleri</CardTitle>
              <CardDescription>
                Hedef kanal başına kuyruk durumu. Zamanlanmış veya manuel tetiklenen gönderimler burada izlenir.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {detail.publishJobs.length === 0 ? (
            <p className="px-6 text-sm text-muted-foreground sm:px-0">
              Henüz kuyruk yok. Üstteki &quot;Hızlı paylaşımı başlat&quot; ile gönderebilir veya zamanlama ile planlayabilirsiniz.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hedef</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Deneme</TableHead>
                  <TableHead className="hidden md:table-cell">Plan / yeniden deneme</TableHead>
                  <TableHead className="max-w-[200px]">Son hata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.publishJobs.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell className="font-medium">{j.targetChannel.name}</TableCell>
                    <TableCell>
                      <PublishJobStatusBadge status={j.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {j.attempts}/{j.maxAttempts}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      <span className="block">{formatDateTimeShort(j.scheduledFor)}</span>
                      {j.nextRetryAt ? (
                        <span className="block text-xs">Yeniden: {formatDateTimeShort(j.nextRetryAt)}</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground" title={j.lastError ?? undefined}>
                      {j.lastError ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold tracking-tight">Medya</h2>
          <p className="text-sm text-muted-foreground">
            Eklenen dosyalar aşağıda listelenir. Videolar tarayıcıda oynatılabilir.
          </p>
        </div>
        <Separator className="mb-6" />
        <ContentDetailMediaGrid items={detail.media} />
      </div>
    </div>
  );
}
