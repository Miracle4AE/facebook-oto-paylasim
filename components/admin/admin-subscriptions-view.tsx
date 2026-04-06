"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateSubscriptionPlanAdminAction } from "@/actions/admin-plans";
import type { SubscriptionPlanRow } from "@/services/admin/subscription-plan.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";

type SubRow = {
  id: string;
  startAt: string;
  endAt: string;
  paymentStatus: string;
  user: { id: string; email: string; name: string | null; archivedAt: string | null };
  plan: { name: string; code: string };
};

type Props = {
  plans: SubscriptionPlanRow[];
  subscriptions: SubRow[];
};

export function AdminSubscriptionsView({ plans, subscriptions }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "expiring" | "expired">("all");

  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 86400 * 1000);

  const filtered = subscriptions.filter((s) => {
    const end = new Date(s.endAt);
    if (filter === "expired") return end < now;
    if (filter === "expiring") return end >= now && end <= in7;
    return true;
  });

  async function savePlan(p: SubscriptionPlanRow, form: FormData) {
    const res = await updateSubscriptionPlanAdminAction({
      id: p.id,
      name: String(form.get("name") ?? ""),
      maxTargetChannels: Number(form.get("maxTargetChannels")),
      dailyPublishLimit: Number(form.get("dailyPublishLimit")),
      isActive: form.has("isActive"),
      description: String(form.get("description") ?? "") || null,
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Plan güncellendi");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Abonelikler</h1>
        <p className="text-sm text-muted-foreground">Plan limitleri ve kullanıcı abonelikleri (manuel takip).</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.id}>
            <CardHeader>
              <CardTitle className="text-lg">
                {p.name}{" "}
                <span className="text-xs font-normal text-muted-foreground">({p.code})</span>
              </CardTitle>
              <CardDescription>Limit ve açıklama</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                action={(fd) => void savePlan(p, fd)}
                className="space-y-3"
              >
                <div className="space-y-1">
                  <Label htmlFor={`name-${p.id}`}>Plan adı</Label>
                  <Input id={`name-${p.id}`} name="name" defaultValue={p.name} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor={`max-${p.id}`}>Maks. hedef</Label>
                    <Input
                      id={`max-${p.id}`}
                      name="maxTargetChannels"
                      type="number"
                      defaultValue={p.maxTargetChannels}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`daily-${p.id}`}>Günlük limit</Label>
                    <Input
                      id={`daily-${p.id}`}
                      name="dailyPublishLimit"
                      type="number"
                      defaultValue={p.dailyPublishLimit}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-border/60 p-2">
                  <input
                    type="checkbox"
                    id={`active-${p.id}`}
                    name="isActive"
                    defaultChecked={p.isActive}
                    className="h-4 w-4 accent-primary"
                  />
                  <Label htmlFor={`active-${p.id}`}>Plan satışta / aktif</Label>
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`desc-${p.id}`}>Açıklama</Label>
                  <Textarea id={`desc-${p.id}`} name="description" defaultValue={p.description ?? ""} rows={2} />
                </div>
                <Button type="submit" size="sm">
                  Kaydet
                </Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Kullanıcı abonelikleri</CardTitle>
            <CardDescription>Süresi dolan / yakında bitecek filtreleri</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant={filter === "all" ? "secondary" : "outline"} onClick={() => setFilter("all")}>
              Tümü
            </Button>
            <Button
              type="button"
              size="sm"
              variant={filter === "expiring" ? "secondary" : "outline"}
              onClick={() => setFilter("expiring")}
            >
              7 gün içinde bitecek
            </Button>
            <Button
              type="button"
              size="sm"
              variant={filter === "expired" ? "secondary" : "outline"}
              onClick={() => setFilter("expired")}
            >
              Süresi dolmuş
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kullanıcı</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Başlangıç</TableHead>
                <TableHead>Bitiş</TableHead>
                <TableHead>Ödeme</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Kayıt yok.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <a href={`/admin/kullanicilar/${s.user.id}`} className="font-medium text-primary hover:underline">
                        {s.user.name ?? s.user.email}
                      </a>
                      {s.user.archivedAt ? (
                        <span className="ml-2 text-xs text-muted-foreground">(arşiv)</span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {s.plan.name} ({s.plan.code})
                    </TableCell>
                    <TableCell className="text-xs">
                      {format(new Date(s.startAt), "d MMM yyyy", { locale: tr })}
                    </TableCell>
                    <TableCell className="text-xs">
                      {format(new Date(s.endAt), "d MMM yyyy", { locale: tr })}
                    </TableCell>
                    <TableCell>{s.paymentStatus}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
