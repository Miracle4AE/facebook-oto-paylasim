import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(99,102,241,0.08),_transparent_50%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-8 px-4 py-16 text-center">
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary">Facebook otomasyon</p>
          <h1 className="text-3xl font-semibold tracking-tight">Facebook Otomatik Paylaşım Paneli</h1>
          <p className="text-sm text-muted-foreground">
            Giriş türünü seçin: müşteri paneli veya yönetici hesabı ayrı adreslerdedir.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild className="w-full sm:w-auto">
            <Link href="/login">Panel girişi</Link>
          </Button>
          <Button asChild variant="outline" className="w-full border-primary/40 sm:w-auto">
            <Link href="/admin/login">Yönetici girişi</Link>
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Yönetici: <span className="font-mono">/admin/login</span> · Müşteri: <span className="font-mono">/login</span>
        </p>
      </div>
    </div>
  );
}
