import { redirect } from "next/navigation";

/** Kısayol: /admin → yönetici giriş ekranı */
export default function AdminIndexPage() {
  redirect("/admin/login");
}
