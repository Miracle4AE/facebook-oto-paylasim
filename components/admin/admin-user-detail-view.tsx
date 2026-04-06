"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  archiveUserAdminAction,
  extendSubscriptionAdminAction,
  forcePasswordChangeAdminAction,
  rotateTempPasswordAdminAction,
  setUserActiveAdminAction,
  updateSubscriptionAdminAction,
  updateUserAdminAction,
} from "@/actions/admin-users";
import type { AdminUserDetail } from "@/services/admin/user-admin-list.service";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { adminUpdateUserSchema } from "@/lib/validations";
import { UserRole } from "@/types/domain";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";
import type { z } from "zod";

type PlanOption = { id: string; code: string; name: string };

type Props = {
  data: AdminUserDetail;
  plans: PlanOption[];
  currentUserId: string;
};

type EditForm = z.infer<typeof adminUpdateUserSchema>;

export function AdminUserDetailView({ data, plans, currentUserId }: Props) {
  const router = useRouter();
  const { user, subscription, stats, facebook, recentLogs, recentPublishAttempts, auditForUser } = data;
  const isSelf = user.id === currentUserId;
  const [pwdOpen, setPwdOpen] = useState(false);
  const [generatedPwd, setGeneratedPwd] = useState<string | null>(null);
  const [extendOpen, setExtendOpen] = useState(false);
  const [extendDays, setExtendDays] = useState("30");
  const [subOpen, setSubOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const editForm = useForm<EditForm>({
    resolver: zodResolver(adminUpdateUserSchema),
    defaultValues: {
      userId: user.id,
      name: user.name ?? "",
      email: user.email,
      isActive: user.isActive,
      role: user.role === UserRole.ADMIN ? UserRole.ADMIN : UserRole.USER,
      newTemporaryPassword: "",
      adminNote: user.adminNote ?? "",
    },
  });

  const defaultSub = (() => {
    const start = subscription?.startAt ?? new Date();
    const end =
      subscription?.endAt ??
      (() => {
        const e = new Date();
        e.setFullYear(e.getFullYear() + 1);
        return e;
      })();
    return {
      planId:
        subscription && plans.length > 0
          ? plans.find((p) => p.code === subscription.planCode)?.id ?? plans[0]!.id
          : plans[0]?.id ?? "",
      startAt: format(start, "yyyy-MM-dd'T'HH:mm"),
      endAt: format(end, "yyyy-MM-dd'T'HH:mm"),
      paymentNote: subscription?.paymentNote ?? "",
      paymentStatus: subscription?.paymentStatus ?? "PENDING",
      autoRenew: subscription?.autoRenew ?? false,
    };
  })();

  type SubFormValues = {
    planId: string;
    startAt: string;
    endAt: string;
    paymentNote: string;
    paymentStatus: string;
    autoRenew: boolean;
  };

  const subForm = useForm<SubFormValues>({
    defaultValues: defaultSub,
  });

  async function onSaveProfile(values: EditForm) {
    const res = await updateUserAdminAction(values);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Kaydedildi");
    router.refresh();
  }

  async function onRotate() {
    const res = await rotateTempPasswordAdminAction(user.id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setGeneratedPwd(res.password);
    setPwdOpen(true);
    router.refresh();
  }

  async function onForcePwd() {
    const res = await forcePasswordChangeAdminAction(user.id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Kullanıcı bir sonraki girişte şifre değiştirmek zorunda");
    router.refresh();
  }

  async function onToggleActive(next: boolean) {
    if (isSelf && !next) {
      toast.error("Kendi hesabınızı pasifleştiremezsiniz");
      return;
    }
    const res = await setUserActiveAdminAction(user.id, next);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(next ? "Aktifleştirildi" : "Pasifleştirildi");
    router.refresh();
  }

  async function onArchive() {
    const res = await archiveUserAdminAction(user.id);
    setArchiveOpen(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Arşivlendi");
    router.push("/admin/kullanicilar");
  }

  async function onExtend() {
    const d = parseInt(extendDays, 10);
    const res = await extendSubscriptionAdminAction(user.id, d);
    setExtendOpen(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Abonelik uzatıldı");
    router.refresh();
  }

  async function onSaveSub(v: SubFormValues) {
    const res = await updateSubscriptionAdminAction({
      userId: user.id,
      planId: v.planId,
      startAt: new Date(v.startAt).toISOString(),
      endAt: new Date(v.endAt).toISOString(),
      paymentNote: v.paymentNote || null,
      paymentStatus: v.paymentStatus,
      autoRenew: v.autoRenew,
    });
    setSubOpen(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Abonelik güncellendi");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
            <Link href="/admin/kullanicilar">← Kullanıcı listesi</Link>
          </Button>
          <h1 className="text-3xl font-semibold tracking-tight">{user.name ?? user.email}</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={isSelf} onClick={() => void onRotate()}>
            Geçici şifre üret
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void onForcePwd()}>
            Şifre değişimine zorla
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSelf}
            onClick={() => void onToggleActive(!user.isActive)}
          >
            {user.isActive ? "Pasifleştir" : "Aktifleştir"}
          </Button>
          <Button type="button" variant="destructive" size="sm" disabled={isSelf} onClick={() => setArchiveOpen(true)}>
            Arşivle
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Temel bilgiler</CardTitle>
            <CardDescription>Kimlik ve hesap durumu</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Rol</span>
              <Badge>{user.role === UserRole.ADMIN ? "Yönetici" : "Kullanıcı"}</Badge>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Durum</span>
              <span>
                {user.archivedAt ? (
                  <Badge variant="outline">Arşiv</Badge>
                ) : user.isActive ? (
                  <Badge className="bg-emerald-600/90">Aktif</Badge>
                ) : (
                  <Badge variant="secondary">Pasif</Badge>
                )}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Oluşturulma</span>
              <span>{format(user.createdAt, "d MMM yyyy HH:mm", { locale: tr })}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Son giriş</span>
              <span>{user.lastLoginAt ? format(user.lastLoginAt, "d MMM yyyy HH:mm", { locale: tr }) : "—"}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Son şifre değişimi</span>
              <span>
                {user.passwordChangedAt ? format(user.passwordChangedAt, "d MMM yyyy", { locale: tr }) : "—"}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">İlk girişte şifre değişimi</span>
              <span>{user.mustChangePassword ? "Zorunlu" : "Yok"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Abonelik</CardTitle>
              <CardDescription>Plan ve ödeme takibi</CardDescription>
            </div>
            <Button type="button" size="sm" variant="secondary" onClick={() => setSubOpen(true)}>
              Plan / tarih güncelle
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {subscription ? (
              <>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-medium">
                    {subscription.planName} ({subscription.planCode})
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Başlangıç</span>
                  <span>{format(subscription.startAt, "d MMM yyyy", { locale: tr })}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Bitiş</span>
                  <span>{format(subscription.endAt, "d MMM yyyy", { locale: tr })}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Kalan gün</span>
                  <span>{subscription.daysLeft}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Ödeme durumu</span>
                  <span>{subscription.paymentStatus}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Otomatik yenileme</span>
                  <span>{subscription.autoRenew ? "Açık" : "Kapalı"}</span>
                </div>
                {subscription.paymentNote ? (
                  <div className="rounded-md bg-muted/30 p-2 text-xs">
                    <span className="text-muted-foreground">Not: </span>
                    {subscription.paymentNote}
                  </div>
                ) : null}
                <Button type="button" variant="outline" className="mt-2 w-full" onClick={() => setExtendOpen(true)}>
                  Aboneliği uzat (gün)
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground">Kayıtlı abonelik yok.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Düzenle</CardTitle>
          <CardDescription>Profil, rol ve yönetici notu</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onSaveProfile)} className="space-y-4 max-w-xl">
              <input type="hidden" {...editForm.register("userId")} />
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ad soyad</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-posta</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={isSelf && user.role === UserRole.ADMIN}>
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
                control={editForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hesap aktif</FormLabel>
                    <Select
                      value={field.value ? "1" : "0"}
                      onValueChange={(v) => field.onChange(v === "1")}
                      disabled={isSelf}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">Aktif</SelectItem>
                        <SelectItem value="0">Pasif</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="adminNote"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Yönetici notu</FormLabel>
                    <FormControl>
                      <Textarea value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="newTemporaryPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Yeni geçici şifre (isteğe bağlı)</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Boş bırakılırsa değişmez" {...field} />
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

      <Card>
        <CardHeader>
          <CardTitle>Kullanım istatistikleri</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <Stat label="Hedef kanal" value={stats.targetCount} />
          <Stat label="İçerik" value={stats.contentCount} />
          <Stat label="Toplam yayın logu" value={stats.publishTotal} />
          <Stat label="Başarılı yayın" value={stats.publishSuccess} />
          <Stat label="Başarısız yayın" value={stats.publishFailed} />
          <Stat label="Son 30 gün aktivite (log)" value={stats.last30dPublish} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Facebook entegrasyonu</CardTitle>
          <CardDescription>Token bilgileri maskelenmiştir</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {facebook.length === 0 ? (
            <p className="text-sm text-muted-foreground">Bağlı hesap yok.</p>
          ) : (
            facebook.map((f) => (
              <div key={f.id} className="rounded-lg border border-border/60 p-3 text-sm">
                <div className="font-medium">{f.label}</div>
                <div className="mt-1 text-muted-foreground">
                  Sayfa: {f.pageId ?? "—"} · Durum: {f.tokenHealth} · Son güncelleme:{" "}
                  {f.lastChecked ? format(f.lastChecked, "d MMM yyyy HH:mm", { locale: tr }) : "—"}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Son yayın logları</CardTitle>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Kayıt yok.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zaman</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Kanal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentLogs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs">{format(l.createdAt, "d MMM HH:mm", { locale: tr })}</TableCell>
                      <TableCell>{l.status}</TableCell>
                      <TableCell className="text-xs">{l.channelName}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Son yayın denemeleri (işler)</CardTitle>
          </CardHeader>
          <CardContent>
            {recentPublishAttempts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Kayıt yok.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zamanlanan</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Hedef</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPublishAttempts.map((j) => (
                    <TableRow key={j.id}>
                      <TableCell className="text-xs">{format(j.scheduledFor, "d MMM HH:mm", { locale: tr })}</TableCell>
                      <TableCell>{j.status}</TableCell>
                      <TableCell className="text-xs">{j.channelName}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Denetim (bu kullanıcı)</CardTitle>
          <CardDescription>Yönetici işlemleri</CardDescription>
        </CardHeader>
        <CardContent>
          {auditForUser.length === 0 ? (
            <p className="text-sm text-muted-foreground">Kayıt yok.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {auditForUser.map((a) => (
                <li key={a.id} className="flex flex-wrap justify-between gap-2 border-b border-border/40 pb-2">
                  <span className="font-mono text-xs">{a.action}</span>
                  <span className="text-muted-foreground">{a.actorEmail}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(a.createdAt, "d MMM yyyy HH:mm", { locale: tr })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={pwdOpen} onOpenChange={setPwdOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Geçici şifre</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Bu şifre yalnızca bu ekranda gösterilir; güvenli kanaldan iletin. Loglanmaz.
          </p>
          <Input readOnly value={generatedPwd ?? ""} className="font-mono" />
          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                if (generatedPwd) void navigator.clipboard.writeText(generatedPwd);
                toast.success("Kopyalandı");
              }}
            >
              Panoya kopyala
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={extendOpen} onOpenChange={setExtendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aboneliği uzat</DialogTitle>
          </DialogHeader>
          <Input type="number" min={1} max={3650} value={extendDays} onChange={(e) => setExtendDays(e.target.value)} />
          <DialogFooter>
            <Button type="button" onClick={() => void onExtend()}>
              Uygula
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={subOpen} onOpenChange={setSubOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Abonelik güncelle</DialogTitle>
          </DialogHeader>
          <Form {...subForm}>
            <form
              onSubmit={subForm.handleSubmit(onSaveSub)}
              className="space-y-3"
            >
              <FormField
                control={subForm.control}
                name="planId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {plans.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={subForm.control}
                name="startAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Başlangıç</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={subForm.control}
                name="endAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bitiş</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={subForm.control}
                name="paymentNote"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ödeme notu</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={subForm.control}
                name="paymentStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ödeme durumu</FormLabel>
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
                  </FormItem>
                )}
              />
              <FormField
                control={subForm.control}
                name="autoRenew"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border/60 p-3">
                    <FormLabel>Otomatik yenileme (bilgi)</FormLabel>
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

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arşivlemek istiyor musunuz?</AlertDialogTitle>
            <AlertDialogDescription>
              Kullanıcı giriş yapamaz. İşlem denetim kaydına yazılır.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={() => void onArchive()}>Arşivle</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/15 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
