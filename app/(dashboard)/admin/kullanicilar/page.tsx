import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/session";
import { listUsersForAdmin } from "@/services/admin/user-admin.service";
import { UserManagementView } from "@/components/admin/user-management-view";

export default async function AdminKullanicilarPage() {
  const admin = await requireAdminUser();
  if (!admin) redirect("/dashboard");

  const users = await listUsersForAdmin();

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Kullanıcı yönetimi</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Kayıt ekranı yoktur; ücretli müşteriler için hesap buradan oluşturulur. Geçici şifre ile giriş yapan kullanıcılar
          ilk oturumda şifre değişimine yönlendirilir.
        </p>
      </div>
      <UserManagementView initialUsers={users} currentUserId={admin.id} />
    </div>
  );
}
