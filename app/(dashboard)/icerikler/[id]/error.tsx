"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ContentDetailError({ error, reset }: Props) {
  useEffect(() => {
    console.error("[icerikler/[id]]", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-2 py-8">
      <EmptyState
        title="İçerik yüklenemedi"
        description="Bu sayfa şu anda gösterilemiyor. Bağlantınızı kontrol edin veya bir süre sonra tekrar deneyin."
        icon={AlertTriangle}
        tone="destructive"
        className="max-w-md border-destructive/20 bg-card/40"
        action={
          <div className="flex flex-col gap-1.5 sm:flex-row sm:justify-center">
            <Button type="button" variant="default" onClick={() => reset()}>
              Tekrar dene
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/icerikler">İçerik listesine dön</Link>
            </Button>
          </div>
        }
      />
    </div>
  );
}
