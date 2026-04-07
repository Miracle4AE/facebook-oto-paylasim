"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Filter, Info, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { targetChannelSchema } from "@/lib/validations";
import { createTargetChannel, deleteTargetChannel, updateTargetChannel } from "@/actions/targets";
import { TargetChannelType } from "@/types/domain";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

type Target = {
  id: string;
  name: string;
  url: string;
  channelType: string;
  isActive: boolean;
  notes: string | null;
  pageId: string | null;
  externalId: string | null;
  facebookAccountId: string | null;
};

type FacebookAcc = { id: string; label: string };

const formSchema = targetChannelSchema;
type FormValues = z.infer<typeof formSchema>;

const typeLabels: Record<string, string> = {
  PAGE: "Sayfa",
  GROUP: "Grup",
  PROFILE: "Profil",
  OTHER: "Diğer",
};

export function TargetsView({
  initialTargets,
  facebookAccounts,
}: {
  initialTargets: Target[];
  facebookAccounts: FacebookAcc[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [activeOnly, setActiveOnly] = useState(false);
  const [editing, setEditing] = useState<Target | null>(null);
  const [deleting, setDeleting] = useState<Target | null>(null);
  const [open, setOpen] = useState(false);
  /** Düzenlemede boş bırakıldığında mevcut hedef tokenını korumak için; işaretlenirse sunucuda silinir */
  const [clearPageAccessToken, setClearPageAccessToken] = useState(false);

  const filtered = useMemo(() => {
    return initialTargets.filter((t) => {
      const q = query.trim().toLowerCase();
      const matchQ = !q || t.name.toLowerCase().includes(q) || t.url.toLowerCase().includes(q);
      const matchT = typeFilter === "ALL" || t.channelType === typeFilter;
      const matchA = !activeOnly || t.isActive;
      return matchQ && matchT && matchA;
    });
  }, [initialTargets, query, typeFilter, activeOnly]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      url: "https://",
      channelType: TargetChannelType.PAGE,
      pageId: "",
      externalId: "",
      notes: "",
      isActive: true,
      facebookAccountId: null,
      pageAccessToken: "",
    },
  });

  const channelType = useWatch({ control: form.control, name: "channelType" });

  function resetForCreate() {
    setEditing(null);
    setClearPageAccessToken(false);
    form.reset({
      name: "",
      url: "https://",
      channelType: TargetChannelType.PAGE,
      pageId: "",
      externalId: "",
      notes: "",
      isActive: true,
      facebookAccountId: null,
      pageAccessToken: "",
    });
  }

  function resetForEdit(target: Target) {
    setEditing(target);
    setClearPageAccessToken(false);
    form.reset({
      name: target.name,
      url: target.url,
      channelType: target.channelType as FormValues["channelType"],
      pageId: target.pageId ?? "",
      externalId: target.externalId ?? "",
      notes: target.notes ?? "",
      isActive: target.isActive,
      facebookAccountId: target.facebookAccountId,
      pageAccessToken: "",
    });
  }

  async function onSubmit(values: FormValues) {
    const payload: Record<string, unknown> = {
      ...values,
      pageId: values.pageId || undefined,
      externalId: values.externalId || undefined,
      notes: values.notes || undefined,
      facebookAccountId: values.facebookAccountId || null,
    };

    if (editing) {
      if (clearPageAccessToken) {
        payload.pageAccessToken = "";
      } else if (values.pageAccessToken?.trim()) {
        payload.pageAccessToken = values.pageAccessToken.trim();
      } else {
        delete payload.pageAccessToken;
      }
    } else {
      payload.pageAccessToken = values.pageAccessToken?.trim() || undefined;
    }
    const res = editing
      ? await updateTargetChannel(editing.id, payload)
      : await createTargetChannel(payload);
    if (!res.ok) {
      toast.error(res.error ?? "İşlem başarısız");
      return;
    }
    toast.success(editing ? "Hedef güncellendi" : "Hedef oluşturuldu");
    setEditing(null);
    setOpen(false);
    resetForCreate();
    router.refresh();
  }

  async function onDelete() {
    if (!deleting) return;
    const res = await deleteTargetChannel(deleting.id);
    if (!res.ok) {
      toast.error(res.error ?? "Silinemedi");
      return;
    }
    toast.success("Hedef silindi");
    setDeleting(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Hedef kanallar</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sayfa, grup veya profil hedeflerinizi yönetin. Arama ve filtreler anında uygulanır.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) {
              resetForCreate();
            }
          }}
        >
          <Button
            type="button"
            onClick={() => {
              resetForCreate();
              setOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Yeni hedef
          </Button>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Hedefi düzenle" : "Yeni hedef"}</DialogTitle>
              <DialogDescription>
                Meta API kısıtları hedef türüne göre değişebilir; üretimde izinleri doğrulayın.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hedef adı</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hedef linki</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="channelType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hedef türü</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={TargetChannelType.PAGE}>Sayfa</SelectItem>
                          <SelectItem value={TargetChannelType.GROUP}>Grup</SelectItem>
                          <SelectItem value={TargetChannelType.PROFILE}>Profil</SelectItem>
                          <SelectItem value={TargetChannelType.OTHER}>Diğer</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {channelType === TargetChannelType.GROUP && (
                  <div className="flex gap-3 rounded-lg border border-primary/25 bg-primary/5 p-4 text-sm">
                    <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                    <div className="space-y-1 text-muted-foreground">
                      <p className="font-medium text-foreground">Grup hedefi — yarı otomatik paylaşım</p>
                      <p>
                        Otomatik Graph gönderimi gruplarda desteklenmez; bunun yerine{" "}
                        <strong className="font-medium text-foreground">İçerik detay</strong> sayfasındaki &quot;Gruplarda
                        paylaş&quot; bölümü ile grupları sırayla açıp metni panodan yapıştırabilirsiniz. Facebook
                        kuralları gereği gönderiler manueldir.
                      </p>
                    </div>
                  </div>
                )}
                {channelType === TargetChannelType.PROFILE && (
                  <div className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
                    <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-500" aria-hidden />
                    <div className="space-y-1 text-muted-foreground">
                      <p className="font-medium text-foreground">Profil hedefi — Graph API sınırlı</p>
                      <p>
                        Kişisel profil yayınları Meta tarafından sıkı kısıtlanır; otomatik paylaşım yalnızca{" "}
                        <strong className="font-medium text-foreground">sayfa (PAGE)</strong> hedefleri için
                        desteklenir.
                      </p>
                    </div>
                  </div>
                )}
                <FormField
                  control={form.control}
                  name="facebookAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bağlı Facebook hesabı</FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                        value={field.value ?? "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="İsteğe bağlı" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Seçilmedi</SelectItem>
                          {facebookAccounts.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                {channelType === TargetChannelType.PAGE && (
                  <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-4">
                    <FormField
                      control={form.control}
                      name="pageAccessToken"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hedefe özel sayfa erişim tokenı (isteğe bağlı)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              autoComplete="off"
                              placeholder={
                                editing
                                  ? "Yeni token girin; boş bırakırsanız mevcut korunur"
                                  : "Boş bırakılabilir — Entegrasyon’daki hesap tokenı kullanılır"
                              }
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            Entegrasyon sayfasından bağladığınız Facebook hesabı, Page ID eşleştiğinde genelde
                            yeterlidir. Aynı sayfa için farklı bir Page Access Token kullanmanız gerekiyorsa buraya
                            girin; token sunucuda şifrelenir.
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {editing ? (
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="clear-page-token"
                          checked={clearPageAccessToken}
                          onCheckedChange={(v) => setClearPageAccessToken(v === true)}
                        />
                        <label htmlFor="clear-page-token" className="cursor-pointer text-sm leading-tight text-muted-foreground">
                          Kayıtlı hedef tokenını kaldır (hesap tokenına veya yeni girişe dönülür)
                        </label>
                      </div>
                    ) : null}
                  </div>
                )}
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
                        <p className="text-xs text-muted-foreground">Pasif hedeflere gönderim yapılmaz.</p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit">{editing ? "Kaydet" : "Oluştur"}</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="text-base font-medium">Liste</CardTitle>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative">
              <Input
                placeholder="Ara..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="md:w-64"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Tür" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tüm türler</SelectItem>
                  <SelectItem value="PAGE">Sayfa</SelectItem>
                  <SelectItem value="GROUP">Grup</SelectItem>
                  <SelectItem value="PROFILE">Profil</SelectItem>
                  <SelectItem value="OTHER">Diğer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="button" variant={activeOnly ? "default" : "outline"} size="sm" onClick={() => setActiveOnly(!activeOnly)}>
              Sadece aktif
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <EmptyState
              icon={Filter}
              title="Kayıt bulunamadı"
              description="Filtreleri gevşetin veya yeni bir hedef ekleyin."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ad</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="font-medium">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.url}</div>
                    </TableCell>
                    <TableCell>{typeLabels[t.channelType] ?? t.channelType}</TableCell>
                    <TableCell>
                      {t.isActive ? <Badge variant="success">Aktif</Badge> : <Badge variant="secondary">Pasif</Badge>}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          resetForEdit(t);
                          setOpen(true);
                        }}
                      >
                        Düzenle
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleting(t)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hedefi silinsin mi?</AlertDialogTitle>
            <AlertDialogDescription>Bu işlem geri alınamaz.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
