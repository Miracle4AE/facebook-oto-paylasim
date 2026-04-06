import { AdminSettingsForm } from "@/components/admin/admin-settings-form";
import { getSystemSettings } from "@/services/admin/system-settings.service";

export default async function AdminSettingsPage() {
  const s = await getSystemSettings();
  return <AdminSettingsForm initial={s} />;
}
