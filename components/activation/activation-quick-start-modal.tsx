"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createActivationQuickStartContent } from "@/actions/activation-quickstart";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type GroupOption = { id: string; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupTargets: GroupOption[];
};

export function ActivationQuickStartModal({ open, onOpenChange, groupTargets }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);

  const hasGroups = groupTargets.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasGroups) {
      toast.error("Önce en az bir grup hedefi ekleyin.");
      return;
    }
    const trimmed = body.trim();
    if (trimmed.length === 0) {
      toast.error("Kısa bir metin yazın.");
      return;
    }
    setPending(true);
    try {
      const res = await createActivationQuickStartContent({
        title: title.trim() || null,
        body: trimmed,
      });
      if (!res.ok) {
        toast.error(res.error ?? "İçerik oluşturulamadı");
        return;
      }
      toast.success("İçerik hazır — paylaşım ekranına gidiliyor.");
      onOpenChange(false);
      setTitle("");
      setBody("");
      router.push(`/icerikler/${res.id}?activation=quickstart`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Hızlı içerik</DialogTitle>
          <DialogDescription>
            Kısa bir metin yaz; ardından içerik sayfasında gruplarda paylaşımı başlat.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {hasGroups ? (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <p className="font-medium text-foreground">Paylaşım için gruplar</p>
              <ul className="mt-2 max-h-28 list-inside list-disc space-y-0.5 overflow-y-auto text-muted-foreground">
                {groupTargets.map((g) => (
                  <li key={g.id}>{g.name}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-950 dark:text-amber-100">
              <p className="font-medium">Grup hedefi yok</p>
              <p className="mt-1 text-muted-foreground">
                Paylaşım için önce{" "}
                <Link href="/hedefler" className="font-medium text-primary underline underline-offset-4">
                  grup ekleyin
                </Link>
                .
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="activation-quick-title">Başlık (isteğe bağlı)</Label>
            <Input
              id="activation-quick-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn. Duyuru"
              maxLength={200}
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="activation-quick-body">Metin</Label>
            <Textarea
              id="activation-quick-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Paylaşmak istediğin kısa metin…"
              rows={5}
              maxLength={20_000}
              disabled={pending}
              required
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={pending || !hasGroups}>
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Oluşturuluyor
                </>
              ) : (
                "Devam et — paylaşım"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
