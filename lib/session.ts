import "server-only";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { UserRole } from "@/types/domain";

export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session.user;
}

export async function requireAdminUser() {
  const user = await getSessionUser();
  if (!user || user.role !== UserRole.ADMIN) return null;
  return user;
}
