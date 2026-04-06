"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { changePasswordAction } from "@/actions/password-change";
import { changePasswordSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type FormValues = z.infer<typeof changePasswordSchema>;

export function ChangePasswordForm() {
  const router = useRouter();
  const { update } = useSession();
  const [loading, setLoading] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    const res = await changePasswordAction(values);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    await update({ mustChangePassword: false });
    toast.success("Şifreniz güncellendi");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="border-border/70 shadow-panel">
      <CardHeader>
        <CardTitle>Yeni şifre</CardTitle>
        <CardDescription>Mevcut geçici şifrenizi ve belirleyeceğiniz kalıcı şifreyi girin.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mevcut şifre</FormLabel>
                  <FormControl>
                    <Input autoComplete="current-password" type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Yeni şifre</FormLabel>
                  <FormControl>
                    <Input autoComplete="new-password" type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Yeni şifre (tekrar)</FormLabel>
                  <FormControl>
                    <Input autoComplete="new-password" type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Kaydediliyor..." : "Şifreyi kaydet"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
