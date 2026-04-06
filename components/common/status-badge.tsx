import { Badge } from "@/components/ui/badge";
import { ContentPostStatus, PublishJobStatus, PublishLogStatus } from "@/types/domain";

const contentLabels: Record<string, string> = {
  [ContentPostStatus.DRAFT]: "Taslak",
  [ContentPostStatus.SCHEDULED]: "Planlandı",
  [ContentPostStatus.PUBLISHED]: "Yayınlandı",
  [ContentPostStatus.FAILED]: "Hata",
};

const jobLabels: Record<string, string> = {
  [PublishJobStatus.PENDING]: "Bekliyor",
  [PublishJobStatus.PROCESSING]: "İşleniyor",
  /** Eski kayıtlar */
  RUNNING: "İşleniyor",
  [PublishJobStatus.SUCCESS]: "Başarılı",
  [PublishJobStatus.FAILED]: "Başarısız",
  [PublishJobStatus.RETRY_SCHEDULED]: "Yeniden denenecek",
  [PublishJobStatus.CANCELLED]: "İptal",
};

const logLabels: Record<string, string> = {
  [PublishLogStatus.SUCCESS]: "Başarılı",
  [PublishLogStatus.FAILED]: "Başarısız",
  [PublishLogStatus.SKIPPED]: "Atlandı",
};

export function ContentStatusBadge({ status }: { status: string }) {
  const label = contentLabels[status] ?? status;
  const variant =
    status === ContentPostStatus.PUBLISHED
      ? "success"
      : status === ContentPostStatus.FAILED
        ? "destructive"
        : status === ContentPostStatus.SCHEDULED
          ? "warning"
          : "secondary";
  return <Badge variant={variant as "success" | "destructive" | "warning" | "secondary"}>{label}</Badge>;
}

export function PublishJobStatusBadge({ status }: { status: string }) {
  const label = jobLabels[status] ?? status;
  const variant =
    status === PublishJobStatus.SUCCESS
      ? "success"
      : status === PublishJobStatus.FAILED
        ? "destructive"
        : status === PublishJobStatus.PROCESSING || status === "RUNNING"
          ? "warning"
          : "secondary";
  return <Badge variant={variant as "success" | "destructive" | "warning" | "secondary"}>{label}</Badge>;
}

export function PublishLogStatusBadge({ status }: { status: string }) {
  const label = logLabels[status] ?? status;
  const variant = status === PublishLogStatus.SUCCESS ? "success" : "destructive";
  return <Badge variant={variant}>{label}</Badge>;
}
