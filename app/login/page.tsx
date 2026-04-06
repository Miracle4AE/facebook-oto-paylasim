import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { LoginForm } from "@/components/login/login-form";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(99,102,241,0.12),_transparent_50%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-12 lg:flex-row lg:items-center lg:gap-16">
        <div className="mb-10 flex-1 space-y-4 lg:mb-0">
          <p className="text-sm font-medium text-primary">Kurumsal otomasyon</p>
          <h1 className="text-4xl font-semibold tracking-tight lg:text-5xl">Facebook Otomatik Paylaşım Paneli</h1>
          <p className="max-w-xl text-sm text-muted-foreground lg:text-base">
            İçeriklerinizi güvenli oturumla yönetin, hedef kanallarınıza zamanlayın ve gönderim sonuçlarını ayrıntılı
            loglarla izleyin. Meta API kısıtları servis katmanında soyutlanmıştır.
          </p>
          <div className="rounded-xl border border-border/60 bg-card/50 p-4 text-xs text-muted-foreground shadow-soft">
            <p>
              Demo giriş: <span className="font-mono text-foreground">demo@paylasim.app</span> /{" "}
              <span className="font-mono text-foreground">demo123456</span>
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/90">
              Yönetici hesabıyla giriş yaptıktan sonra sol menüde <strong className="text-foreground/90">Kullanıcılar</strong>{" "}
              (veya <span className="font-mono text-foreground/80">/admin/kullanicilar</span>) üzerinden kullanıcı
              oluşturabilirsiniz. Önce oturum açmanız gerekir — ayrı bir herkese açık admin adresi yoktur.
            </p>
          </div>
        </div>
        <div className="flex-1">
          <LoginForm />
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Devam ederek{" "}
            <Link href="#" className="underline underline-offset-4">
              güvenlik koşullarını
            </Link>{" "}
            kabul etmiş olursunuz.
          </p>
        </div>
      </div>
    </div>
  );
}
