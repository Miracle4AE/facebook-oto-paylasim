import { AdminSidebar } from "@/components/admin/panel/admin-sidebar";
import { AdminTopbar } from "@/components/admin/panel/admin-topbar";

type Props = {
  user: { name?: string | null; email?: string | null };
  children: React.ReactNode;
};

export function AdminPanelShell({ user, children }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <AdminSidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <AdminTopbar user={user} />
          <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
