import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "@/components/settings/settings-form";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { appSetting: true },
  });
  if (!user) return null;

  const settings = user.appSetting;

  return (
    <SettingsForm
      defaultValues={{
        name: user.name ?? "",
        defaultTimezone: settings?.defaultTimezone ?? user.timezone ?? "Europe/Istanbul",
        notifyEmail: settings?.notifyEmail ?? true,
        notifyInApp: settings?.notifyInApp ?? true,
        notifyPublishResult: settings?.notifyPublishResult ?? true,
      }}
    />
  );
}
