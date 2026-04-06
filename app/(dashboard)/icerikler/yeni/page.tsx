import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewContentForm } from "@/components/content/new-content-form";

export default function NewContentPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Button variant="ghost" className="-ml-2 w-fit" asChild>
            <Link href="/icerikler">
              <ArrowLeft className="mr-2 h-4 w-4" />
              İçeriklere dön
            </Link>
          </Button>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Yeni içerik</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Taslak kaydedin, medya ekleyin ve zamanlama ekranından yayına bağlayın.
          </p>
        </div>
      </div>
      <NewContentForm />
    </div>
  );
}
