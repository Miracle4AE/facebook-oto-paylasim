import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EditContentNotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/70 bg-card/40 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <FileQuestion className="h-7 w-7" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">İçerik bulunamadı</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Bu kayıt silinmiş olabilir veya bu içeriği görüntüleme yetkiniz bulunmuyor.
        </p>
      </div>
      <Button asChild>
        <Link href="/icerikler">İçerik listesine dön</Link>
      </Button>
    </div>
  );
}
