"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { preLoginCheck } from "@/actions/auth-login";
import { loginSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type FormValues = z.infer<typeof loginSchema>;

export type LoginFormProps = {
  /** Giriş sonrası yönlendirme (ör. yönetici girişinde /admin/kullanicilar) */
  redirectAfterLogin?: string;
  title?: string;
  description?: string;
  submitLabel?: string;
};

export function LoginForm({
  redirectAfterLogin = "/dashboard",
  title = "Giriş yap",
  description = "E-posta ve şifrenizle panele erişin.",
  submitLabel = "Giriş yap",
}: LoginFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    const pre = await preLoginCheck(values);
    if (!pre.ok) {
      setLoading(false);
      if (pre.reason === "inactive") {
        toast.error("Hesabınız pasif durumda. Yöneticiyle iletişime geçin.");
      } else {
        toast.error("E-posta veya şifre hatalı.");
      }
      return;
    }
    const res = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      toast.error("Oturum oluşturulamadı. Tekrar deneyin.");
      return;
    }
    toast.success("Hoş geldiniz");
    router.push(redirectAfterLogin);
    router.refresh();
  }

  return (
    <Card className="border-border/70 shadow-panel">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-posta</FormLabel>
                  <FormControl>
                    <Input autoComplete="email" type="email" placeholder="ornek@firma.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Şifre</FormLabel>
                  <FormControl>
                    <Input autoComplete="current-password" type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Giriş yapılıyor..." : submitLabel}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
