import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminCreateUserForm } from "@/components/admin/admin-create-user-form";
import { Button } from "@/components/ui/button";
import { listSubscriptionPlans } from "@/services/admin/subscription-plan.service";

export default async function AdminNewUserPage() {
  const plans = await listSubscriptionPlans();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/kullanicilar" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Listeye dön
          </Link>
        </Button>
      </div>
      <AdminCreateUserForm plans={plans.map((p) => ({ id: p.id, code: p.code, name: p.name }))} />
    </div>
  );
}
