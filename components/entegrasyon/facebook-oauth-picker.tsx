"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { completeFacebookPageConnection, discardFacebookOAuthState } from "@/actions/facebook-oauth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PageRow = { id: string; name: string };

type Props = {
  stateId: string;
  pages: PageRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FacebookOAuthPicker({ stateId, pages, open, onOpenChange }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string | null>(pages[0]?.id ?? null);

  function connect() {
    if (!selected) {
      toast.error("Bir sayfa seçin.");
      return;
    }
    startTransition(async () => {
      const res = await completeFacebookPageConnection(stateId, selected);
      if (!res.ok) {
        toast.error(res.error ?? "Bağlantı tamamlanamadı.");
        return;
      }
      toast.success("Facebook sayfası bağlandı.");
      onOpenChange(false);
      router.refresh();
    });
  }

  function discard() {
    startTransition(async () => {
      await discardFacebookOAuthState(stateId);
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sayfa seçin</DialogTitle>
          <DialogDescription>
            Birden fazla sayfa yönetiminiz var. Bu panele hangi sayfanın erişim anahtarını kaydetmek istediğinizi seçin.
          </DialogDescription>
        </DialogHeader>
        <ul className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-border/60 p-2">
          {pages.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setSelected(p.id)}
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  selected === p.id ? "bg-primary/15 font-medium text-foreground" : "hover:bg-muted/80"
                }`}
              >
                <span className="block">{p.name}</span>
                <span className="text-xs text-muted-foreground">ID: {p.id}</span>
              </button>
            </li>
          ))}
        </ul>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="ghost" disabled={pending} onClick={discard}>
            Vazgeç
          </Button>
          <Button type="button" disabled={pending} onClick={connect}>
            {pending ? "Kaydediliyor..." : "Bu sayfayı bağla"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
