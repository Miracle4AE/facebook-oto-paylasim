"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { deleteFacebookAccount, upsertFacebookAccount } from "@/actions/facebook";
import { facebookAccountBaseSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { FacebookOAuthPicker } from "@/components/entegrasyon/facebook-oauth-picker";
import { FacebookIntegrationToasts } from "@/components/entegrasyon/facebook-integration-toasts";
import { Link2, AlertTriangle } from "lucide-react";
import type { FacebookHealthUiStatus } from "@/services/facebook/facebook-user-messages";

type Account = {
  id: string;
  label: string;
  pageId: string | null;
  externalId: string | null;
  isActive: boolean;
  tokenExpiresAt: Date | null;
  tokenExpiringSoon: boolean;
};

type AccountHealthSerialized = {
  status: FacebookHealthUiStatus;
  message: string;
  checkedAt: string;
  expiresAt: string | null;
};

function healthBadgeVariant(
  status: FacebookHealthUiStatus,
): "success" | "destructive" | "secondary" | "outline" | "warning" {
  switch (status) {
    case "identity_connected":
      return "secondary";
    case "connected":
      return "success";
    case "token_expired":
    case "invalid_token":
    case "permission_denied":
      return "destructive";
    case "app_unconfigured":
      return "outline";
    case "network":
      return "warning";
    default:
      return "secondary";
  }
}

function healthShortLabel(status: FacebookHealthUiStatus): string {
  switch (status) {
    case "identity_connected":
      return "Hesap doğrulandı";
    case "connected":
      return "Bağlantı sağlam";
    case "token_expired":
      return "Token süresi dolmuş";
    case "invalid_token":
      return "Geçersiz token";
    case "permission_denied":
      return "Sayfa izni yok";
    case "app_unconfigured":
      return "Uygulama kimliği yok";
    case "network":
      return "Facebook geçici hata";
    default:
      return "Durum belirsiz";
  }
}

const schema = facebookAccountBaseSchema;
type FormValues = z.infer<typeof schema>;

type Props = {
  accounts: Account[];
  hasAppCredentials: boolean;
  oauthPending: { stateId: string; pages: { id: string; name: string }[] } | null;
  fbError: string | null;
  fbDesc: string | null;
  showConnected: boolean;
  connectedAsUserIdentity?: boolean;
  healthByAccountId: Record<string, AccountHealthSerialized>;
};

export function FacebookAccountsPanel({
  accounts,
  hasAppCredentials,
  oauthPending,
  fbError,
  fbDesc,
  showConnected,
  connectedAsUserIdentity,
  healthByAccountId,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [deleting, setDeleting] = useState<Account | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (oauthPending && oauthPending.pages.length > 0) {
      setPickerOpen(true);
    } else {
      setPickerOpen(false);
    }
  }, [oauthPending]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      label: "",
      accessToken: "",
      pageId: "",
      externalId: "",
      appId: "",
      appSecret: "",
      notes: "",
      isActive: true,
    },
  });

  function resetCreate() {
    setEditing(null);
    form.reset({
      label: "",
      accessToken: "",
      pageId: "",
      externalId: "",
      appId: "",
      appSecret: "",
      notes: "",
      isActive: true,
    });
  }

  function beginEdit(acc: Account) {
    setEditing(acc);
    form.reset({
      label: acc.label,
      accessToken: "",
      pageId: acc.pageId ?? "",
      externalId: acc.externalId ?? "",
      appId: "",
      appSecret: "",
      notes: "",
      isActive: acc.isActive,
    });
    setOpen(true);
  }

  async function onSubmit(values: FormValues) {
    if (!editing && !values.accessToken?.trim()) {
      toast.error("Erişim anahtarı gerekli");
      return;
    }
    const payload = {
      ...values,
      pageId: values.pageId || undefined,
      externalId: values.externalId || undefined,
      appId: values.appId || undefined,
      appSecret: values.appSecret || undefined,
      notes: values.notes || undefined,
    };
    const res = await upsertFacebookAccount(editing?.id, payload);
    if (!res.ok) {
      toast.error(res.error ?? "Kaydedilemedi");
      return;
    }
    toast.success(editing ? "Hesap güncellendi" : "Hesap eklendi");
    setOpen(false);
    resetCreate();
    router.refresh();
  }

  async function onDelete() {
    if (!deleting) return;
    const res = await deleteFacebookAccount(deleting.id);
    if (!res.ok) {
      toast.error(res.error ?? "Silinemedi");
      return;
    }
    toast.success("Bağlantı kaldırıldı");
    setDeleting(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <FacebookIntegrationToasts
        fbError={fbError}
        fbDesc={fbDesc}
        showConnected={showConnected}
        connectedAsUserIdentity={connectedAsUserIdentity}
      />

      {oauthPending ? (
        <FacebookOAuthPicker
          stateId={oauthPending.stateId}
          pages={oauthPending.pages}
          open={pickerOpen}
          onOpenChange={(v) => {
            setPickerOpen(v);
            if (!v) router.replace("/entegrasyon");
          }}
        />
      ) : null}

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle>Graph API ve hedefler</CardTitle>
          <CardDescription>
            <span className="block">
              Yayın hattı <code className="rounded bg-muted px-1 text-xs">FACEBOOK_PUBLISH_MODE=graph</code> iken
              gerçek Graph çağrıları yapılır; aksi halde mock servis kullanılır.
            </span>
            <span className="mt-2 block font-medium text-foreground">
              Grup ve kişisel profil hedefleri Meta politikaları nedeniyle bu panelde tam desteklenmez; gönderim
              sırasında ilgili hata mesajı üretilir.
            </span>
          </CardDescription>
        </CardHeader>
      </Card>

      {!hasAppCredentials ? (
        <div className="flex gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
          <div>
            <p className="font-medium text-destructive">Facebook uygulaması yapılandırılmadı</p>
            <p className="mt-1 text-muted-foreground">
              OAuth ile bağlanmak için <code className="text-xs">FACEBOOK_APP_ID</code> ve{" "}
              <code className="text-xs">FACEBOOK_APP_SECRET</code> ortam değişkenlerini tanımlayın. Manuel token
              girişi yine de mümkündür.
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Bağlı hesaplar</h2>
          <p className="text-sm text-muted-foreground">
            İlk bağlantı temel hesap doğrulaması yapar. Gelişmiş izinler sonraki aşamada alınabilir. Anahtarlar şifreli
            saklanır.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasAppCredentials ? (
            <Button type="button" asChild>
              <a href="/api/auth/facebook">
                <Link2 className="mr-2 h-4 w-4" />
                Facebook ile bağlan
              </a>
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetCreate();
              setOpen(true);
            }}
          >
            Manuel token ekle
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <p className="text-xs text-muted-foreground">
            Bağlantı sağlığı, sayfa yüklenirken Meta Graph API ile kontrol edilir (debug_token veya sayfa düğümü). Ham
            teknik yanıtlar gösterilmez.
          </p>
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Henüz bağlı hesap yok. Ekleyin; hedeflerinizle eşleşince paylaşım daha sorunsuz olur.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Etiket</TableHead>
                  <TableHead>Sayfa</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>Sağlık</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((a) => {
                  const health = healthByAccountId[a.id];
                  return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.label}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.pageId ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="secondary">Şifreli</Badge>
                        {a.tokenExpiringSoon && a.tokenExpiresAt ? (
                          <Badge variant="destructive">Süre doluyor</Badge>
                        ) : null}
                      </div>
                      {a.tokenExpiresAt ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {format(a.tokenExpiresAt, "d MMM yyyy HH:mm", { locale: tr })}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      {health ? (
                        <div className="space-y-1">
                          <Badge variant={healthBadgeVariant(health.status)}>{healthShortLabel(health.status)}</Badge>
                          <p className="text-xs text-muted-foreground leading-snug">{health.message}</p>
                          <p className="text-[10px] text-muted-foreground/80">
                            Kontrol: {format(new Date(health.checkedAt), "d MMM HH:mm", { locale: tr })}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {a.isActive ? (
                        <Badge variant="success">Aktif</Badge>
                      ) : (
                        <Badge variant="secondary">Pasif</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => beginEdit(a)}>
                        Düzenle
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleting(a)}>
                        Kaldır
                      </Button>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Yeniden bağlama</CardTitle>
          <CardDescription>
            Meta hata kodu 190 (geçersiz token) veya yayın hatalarında token’ı yenileyin: hesabı silip OAuth ile
            tekrar bağlayın veya manuel yeni Page Access Token girin.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Geliştirici modundaki uygulamalarda yalnızca uygulama rolleri ve test kullanıcıları OAuth ile
            yetkilendirebilir.
          </p>
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) resetCreate();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Hesabı güncelle" : "Manuel token"}</DialogTitle>
            <DialogDescription>
              Page Access Token girin; değer AES-256-GCM ile şifrelenerek saklanır.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Etiket</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="accessToken"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Page access token</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="off"
                        placeholder={editing ? "Değiştirmek için yeni token girin" : ""}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="pageId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Page ID</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="externalId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Harici ID</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="appId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>App ID</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="appSecret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>App secret</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Not</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                    <div>
                      <FormLabel>Aktif</FormLabel>
                      <p className="text-xs text-muted-foreground">Pasif hesaplar gönderimde kullanılmaz.</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit">Kaydet</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bağlantıyı kaldır?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu Facebook hesabı kaydı silinecek. Hedef kanallarınızda bu hesaba bağlı seçimleri güncellemeniz
              gerekebilir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Kaldır</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
