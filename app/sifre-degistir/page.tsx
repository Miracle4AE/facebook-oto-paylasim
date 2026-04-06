import { ChangePasswordForm } from "@/components/password/change-password-form";

export default function SifreDegistirPage() {
  return (
    <div className="w-full space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">Şifrenizi güncelleyin</h1>
      <p className="text-sm text-muted-foreground">
        Güvenliğiniz için geçici şifreyle ilk girişten sonra yeni bir şifre belirlemeniz gerekir.
      </p>
      <div className="pt-4">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
