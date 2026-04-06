import { AdminPanelShell } from "@/components/admin/panel/admin-panel-shell";
import { requireAdminPage } from "@/lib/admin-auth";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminPage();
  return <AdminPanelShell user={user}>{children}</AdminPanelShell>;
}
