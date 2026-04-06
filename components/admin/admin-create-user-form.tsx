"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createUserAdminAction } from "@/actions/admin-users";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { adminCreateUserSchema } from "@/lib/validations";
import { UserRole } from "@/types/domain";
import { toast } from "sonner";

type PlanOption = { id: string; code: string; name: string };

type FormValues = z.infer<typeof adminCreateUserSchema>;

type Props = {
  plans: PlanOption[];
};

export function AdminCreateUserForm({ plans }: Props) {
  const router = useRouter();
  const form = useForm<FormValues>({
    resolver: zodResolver(adminCreateUserSchema),
    defaultValues: {
      name: "",
      email: "",
      temporaryPassword: "",
      isActive: true,
      role: UserRole.USER,
      mustChangePassword: true,
      adminNote: null,
      planId: null,
      subscriptionStartAt: null,
      subscriptionEndAt: null,
      paymentNote: null,
      paymentStatus: "PENDING",
    },
  });

  const planId = form.watch("planId");

  async function onSubmit(values: FormValues) {
    const res = await createUserAdminAction(values);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Kullanıcı oluşturuldu");
    router.push(`/admin/kullanicilar/${res.id}`);
    router.refresh();
  }

  return (
    <Card className="max-w-2xl border-border/70 shadow-soft">
      <CardHeader>
        <CardTitle>Yeni kullanıcı</CardTitle>
        <CardDescription>
          E-posta benzersiz olmalıdır. Şifre sunucuda bcrypt ile saklanır; geçici şifre loglanmaz.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ad soyad</FormLabel>
                  <FormControl>
                    <Input placeholder="Örn. Ayşe Yılmaz" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-posta</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="temporaryPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Geçici şifre</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormDescription>En az 8 karakter</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={UserRole.USER}>Kullanıcı</SelectItem>
                        <SelectItem value={UserRole.ADMIN}>Yönetici</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border/60 p-3">
                    <div>
                      <FormLabel>Hesap aktif</FormLabel>
                      <FormDescription>Pasif hesaplar giriş yapamaz</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="mustChangePassword"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border/60 p-3">
                  <div>
                    <FormLabel>İlk girişte şifre değiştirme zorunluluğu</FormLabel>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="adminNote"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Yönetici notu</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="İç not (müşteriye gösterilmez)"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="planId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Abonelik planı (isteğe bağlı)</FormLabel>
                  <Select
                    value={field.value ?? "none"}
                    onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Plan seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Plan atama</SelectItem>
                      {plans.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {planId ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="subscriptionStartAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Başlangıç</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="subscriptionEndAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bitiş</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : null}
            {planId ? (
              <>
                <FormField
                  control={form.control}
                  name="paymentNote"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ödeme notu</FormLabel>
                      <FormControl>
                        <Textarea
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paymentStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manuel ödeme durumu</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PENDING">Beklemede</SelectItem>
                          <SelectItem value="PAID">Ödendi</SelectItem>
                          <SelectItem value="FAILED">Başarısız</SelectItem>
                          <SelectItem value="MANUAL">Manuel</SelectItem>
                          <SelectItem value="WAIVED">Muaf</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button type="submit">Oluştur</Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/kullanicilar">İptal</Link>
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
