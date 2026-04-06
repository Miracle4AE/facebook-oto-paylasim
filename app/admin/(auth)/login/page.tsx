import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { LoginForm } from "@/components/login/login-form";
import { UserRole } from "@/types/domain";

export default async function AdminLoginPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role === UserRole.ADMIN) {
    redirect("/admin");
  }
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.15),_transparent_50%),radial-gradient(circle_at_bottom,_rgba(99,102,241,0.1),_transparent_45%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-12 lg:flex-row lg:items-center lg:gap-16">
        <div className="mb-10 flex-1 space-y-4 lg:mb-0">
          <p className="text-sm font-medium text-primary">Yönetici alanı</p>
          <h1 className="text-4xl font-semibold tracking-tight lg:text-5xl">Yönetici girişi</h1>
          <p className="max-w-xl text-sm text-muted-foreground lg:text-base">
            Kullanıcı oluşturma ve hesap yönetimi için yönetici hesabıyla giriş yapın. Bu sayfa panel müşterilerinden
            ayrı bir adrestir: <span className="font-mono text-foreground/90">/admin/login</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Müşteri / standart panel girişi için{" "}
            <Link href="/login" className="text-primary underline underline-offset-4">
              /login
            </Link>{" "}
            kullanın.
          </p>
        </div>
        <div className="flex-1">
          <LoginForm
            redirectAfterLogin="/admin"
            title="Yönetici oturumu"
            description="Yönetici e-posta ve şifreniz (aynı kimlik doğrulama sunucusu)."
            submitLabel="Yönetici olarak giriş yap"
          />
        </div>
      </div>
    </div>
  );
}
