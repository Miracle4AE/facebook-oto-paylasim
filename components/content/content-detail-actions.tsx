"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Pencil, Rocket, Trash2 } from "lucide-react";
import { deleteContentPost, publishContentNow } from "@/actions/content";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ContentPostStatus } from "@/types/domain";

type Props = {
  contentId: string;
  displayTitle: string;
  status: string;
};

export function ContentDetailActions({ contentId, displayTitle, status }: Props) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | "publish" | "delete">(null);
  const publishLockRef = useRef(false);
  const deleteLockRef = useRef(false);

  const isPublished = status === ContentPostStatus.PUBLISHED;
  const busy = pendingAction !== null;

  async function runDelete() {
    if (deleteLockRef.current || publishLockRef.current) return;
    deleteLockRef.current = true;
    setPendingAction("delete");
    try {
      const res = await deleteContentPost(contentId);
      if (!res.ok) {
        toast.error(res.error ?? "İçerik silinemedi. Oturumunuzu kontrol edip tekrar deneyin.");
        return;
      }
      toast.success("İçerik silindi. Listeye yönlendiriliyorsunuz.");
      setDeleteOpen(false);
      router.push("/icerikler");
      router.refresh();
    } finally {
      setPendingAction(null);
      deleteLockRef.current = false;
    }
  }

  async function runPublishNow() {
    if (publishLockRef.current || deleteLockRef.current || isPublished) return;
    publishLockRef.current = true;
    setPendingAction("publish");
    try {
      const res = await publishContentNow(contentId);
      if (!res.ok) {
        toast.error(res.error ?? "İşlem tamamlanamadı. Bir süre sonra tekrar deneyin.");
        return;
      }
      if (res.result === "already_published") {
        toast.info(res.message, { duration: 5000 });
      } else if (res.result === "queued") {
        toast.success(res.message, { duration: 9000 });
      }
      router.refresh();
    } finally {
      setPendingAction(null);
      publishLockRef.current = false;
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="default" size="sm" asChild>
        <Link href={`/icerikler/${contentId}/duzenle`}>
          <Pencil className="mr-2 h-4 w-4" />
          Düzenle
        </Link>
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={busy || isPublished}
        title={
          isPublished
            ? "Bu içerik zaten yayınlanmış olarak işaretli."
            : "Aktif hedef kanallara kuyruk üzerinden yayınlar (mock veya Graph modu)"
        }
        onClick={() => void runPublishNow()}
      >
        <Rocket className="mr-2 h-4 w-4" />
        {pendingAction === "publish" ? "Gönderiliyor..." : "Hemen paylaş"}
      </Button>
      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!open && pendingAction === "delete") return;
          setDeleteOpen(open);
        }}
      >
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={busy}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {pendingAction === "delete" ? "Siliniyor..." : "Sil"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>İçeriği sil?</AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              <span className="font-medium text-foreground">&quot;{displayTitle}&quot;</span> kalıcı olarak
              silinecek. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void runDelete();
              }}
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {pendingAction === "delete" ? "Siliniyor..." : "Evet, sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
