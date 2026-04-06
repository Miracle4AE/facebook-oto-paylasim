import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";

export default function ContentDetailNotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-2 py-8">
      <EmptyState
        title="İçerik bulunamadı"
        description="Bu adrese ait bir gönderi yok veya bu içeriği görüntüleme yetkiniz bulunmuyor."
        icon={FileQuestion}
        className="max-w-md border-border/80 bg-card/40 px-6 py-16"
        action={
          <Button asChild>
            <Link href="/icerikler">İçerik listesine dön</Link>
          </Button>
        }
      />
    </div>
  );
}
