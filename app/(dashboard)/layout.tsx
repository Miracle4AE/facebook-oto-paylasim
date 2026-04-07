import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { AppShell } from "@/components/layout/app-shell";
import { ensureProTrialForNewUser } from "@/services/billing/ensure-trial.service";

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  await ensureProTrialForNewUser(session.user.id, session.user.role);
  return <AppShell user={session.user}>{children}</AppShell>;
}
