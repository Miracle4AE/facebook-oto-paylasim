"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { FileVideo, ImageIcon, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteContentMediaFile } from "@/actions/content";
import { MediaKind } from "@/types/domain";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type ExistingMediaItem = {
  id: string;
  publicUrl: string;
  kind: string;
  mimeType: string;
  sizeBytes: number;
};

type Props = {
  items: ExistingMediaItem[];
  onRemoved: (id: string) => void;
  disabled?: boolean;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ContentExistingMedia({ items, onRemoved, disabled }: Props) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const deleteLock = useRef(false);

  const deleteBusy = pendingId !== null;

  async function handleConfirmDelete() {
    if (!confirmId || deleteLock.current) return;
    deleteLock.current = true;
    const targetId = confirmId;
    setConfirmId(null);
    setPendingId(targetId);
    try {
      const res = await deleteContentMediaFile(targetId);
      if (!res.ok) {
        toast.error(res.error ?? "Medya kaldırılamadı. Sayfayı yenileyip tekrar deneyin.");
        return;
      }
      toast.success("Medya kaldırıldı.");
      onRemoved(targetId);
    } finally {
      setPendingId(null);
      deleteLock.current = false;
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Mevcut medya</CardTitle>
          <CardDescription>Ekleri kaldırabilir veya aşağıdan yeni dosya ekleyebilirsiniz.</CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Bu içerikte henüz medya yok.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {items.map((m) => {
                const isImage = m.kind === MediaKind.IMAGE;
                const rowBusy = deleteBusy;
                return (
                  <li
                    key={m.id}
                    className="flex gap-3 rounded-xl border border-border/60 bg-muted/20 p-3"
                  >
                    <div
                      className={cn(
                        "relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-background",
                        !isImage && "flex items-center justify-center",
                      )}
                    >
                      {isImage ? (
                        <Image
                          src={m.publicUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="80px"
                          unoptimized={m.publicUrl.endsWith(".svg")}
                        />
                      ) : (
                        <FileVideo className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {isImage ? <ImageIcon className="h-3.5 w-3.5" /> : <FileVideo className="h-3.5 w-3.5" />}
                        <span className="truncate">{m.mimeType}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{formatBytes(m.sizeBytes)}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mt-2 h-8 px-2 text-destructive hover:text-destructive"
                        disabled={disabled || rowBusy}
                        onClick={() => {
                          if (rowBusy) return;
                          setConfirmId(m.id);
                        }}
                      >
                        {pendingId === m.id ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="mr-1 h-4 w-4" />
                        )}
                        Kaldır
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={confirmId !== null}
        onOpenChange={(open) => {
          if (!open && deleteBusy) return;
          if (!open) setConfirmId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Medya kaldırılsın mı?</AlertDialogTitle>
            <AlertDialogDescription>Bu işlem geri alınamaz.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteBusy}
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDelete();
              }}
            >
              {deleteBusy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Kaldırılıyor...
                </>
              ) : (
                "Kaldır"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
