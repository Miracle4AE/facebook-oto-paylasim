import Image from "next/image";
import { Film, ImageIcon } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ContentPostDetailMediaItem } from "@/services/content/content-detail.service";
import { MediaKind } from "@/types/domain";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Props = {
  items: ContentPostDetailMediaItem[];
  className?: string;
};

export function ContentDetailMediaGrid({ items, className }: Props) {
  if (items.length === 0) {
    return (
      <EmptyState
        className={cn("py-14", className)}
        icon={ImageIcon}
        title="Medya ekle, dikkat çeksin"
        description="Görseller paylaşımı güçlendirir; düzenle sayfasından fotoğraf veya video ekleyebilirsiniz."
      />
    );
  }

  return (
    <ul
      className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-3", className)}
      role="list"
    >
      {items.map((m, index) => {
        const isVideo = m.kind === MediaKind.VIDEO;
        const ordinal = index + 1;
        const alt = isVideo ? `Video ${ordinal}` : `Görsel ${ordinal}`;
        return (
          <li key={m.id}>
            <Card className="overflow-hidden border-border/80 shadow-sm transition-shadow hover:shadow-md">
              <div className="relative aspect-video overflow-hidden bg-muted">
                {isVideo ? (
                  <video
                    className="h-full w-full object-contain"
                    controls
                    preload="metadata"
                    src={m.publicUrl}
                  />
                ) : (
                  <Image
                    src={m.publicUrl}
                    alt={alt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    unoptimized
                  />
                )}
                <div className="absolute right-2 top-2 rounded-md bg-background/90 px-2 py-1 text-xs font-medium shadow-sm backdrop-blur">
                  {isVideo ? (
                    <span className="inline-flex items-center gap-1">
                      <Film className="h-3.5 w-3.5" aria-hidden />
                      Video
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <ImageIcon className="h-3.5 w-3.5" aria-hidden />
                      Görsel
                    </span>
                  )}
                </div>
              </div>
              <CardContent className="p-3">
                <p className="truncate text-xs text-muted-foreground" title={m.mimeType}>
                  {m.mimeType}
                </p>
                <p className="text-xs text-muted-foreground">{formatBytes(m.sizeBytes)}</p>
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
