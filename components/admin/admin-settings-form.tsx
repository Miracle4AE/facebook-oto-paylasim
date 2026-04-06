"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { updateSystemSettingsAction } from "@/actions/admin-settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { SystemSettingsDTO } from "@/services/admin/system-settings.service";
import { toast } from "sonner";

const schema = z.object({
  defaultAppName: z.string().min(1).max(200),
  supportEmail: z.string().optional(),
  defaultTimezone: z.string().min(1),
  publishRetryMax: z.number().int().min(0).max(20),
  logRetentionDays: z.number().int().min(1).max(3650),
  maintenanceMode: z.boolean(),
  facebookModeNote: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  initial: SystemSettingsDTO;
};

export function AdminSettingsForm({ initial }: Props) {
  const router = useRouter();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      defaultAppName: initial.defaultAppName,
      supportEmail: initial.supportEmail ?? "",
      defaultTimezone: initial.defaultTimezone,
      publishRetryMax: initial.publishRetryMax,
      logRetentionDays: initial.logRetentionDays,
      maintenanceMode: initial.maintenanceMode,
      facebookModeNote: initial.facebookModeNote,
    },
  });

  async function onSubmit(values: FormValues) {
    const res = await updateSystemSettingsAction({
      ...values,
      supportEmail: values.supportEmail?.trim() || "",
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Ayarlar kaydedildi");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Sistem ayarları</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Uygulama adı, iletişim ve operasyonel limitler (singleton kayıt).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Genel</CardTitle>
          <CardDescription>Marka ve iletişim</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-xl">
              <FormField
                control={form.control}
                name="defaultAppName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Varsayılan uygulama adı</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="supportEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destek e-postası</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="destek@..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="defaultTimezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Varsayılan saat dilimi</FormLabel>
                    <FormControl>
                      <Input placeholder="Europe/Istanbul" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="publishRetryMax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Publish yeniden deneme üst sınırı</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                        value={field.value}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="logRetentionDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Log saklama (gün)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                        value={field.value}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maintenanceMode"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border/60 p-3">
                    <div>
                      <FormLabel>Bakım modu</FormLabel>
                      <p className="text-xs text-muted-foreground">Aktifken müşteri akışını ayrıca kısıtlamak için kullanın</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="facebookModeNote"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facebook / Graph modu notu</FormLabel>
                    <FormControl>
                      <Textarea placeholder="mock, graph api..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit">Kaydet</Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>Tehlikeli alan</CardTitle>
          <CardDescription>Üretimde dikkatli kullanın</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Demo verilerini temizleme ve toplu silme işlemleri ileride ayrı onay akışı ile eklenecektir. Şimdilik
          yalnızca veritabanı yedekleri üzerinden yönetin.
        </CardContent>
      </Card>
    </div>
  );
}
