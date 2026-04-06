import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { UserRole } from "@/types/domain";

/**
 * Admin panel sayfaları için sunucu tarafı guard.
 * Yetkisiz kullanıcı müşteri paneline yönlendirilir.
 */
export async function requireAdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/admin/login");
  }
  if (session.user.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }
  return session.user;
}
