"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  createUserAdminAction,
  setUserActiveAdminAction,
  updateUserAdminAction,
} from "@/actions/admin-users";
import type { AdminUserListItem } from "@/services/admin/user-admin.service";
import { adminCreateUserSchema, adminUpdateUserSchema } from "@/lib/validations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserRole } from "@/types/domain";
import { toast } from "sonner";

type Props = {
  initialUsers: AdminUserListItem[];
  currentUserId: string;
};

function formatDt(d: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(d));
}

type CreateForm = z.infer<typeof adminCreateUserSchema>;
type EditForm = z.infer<typeof adminUpdateUserSchema>;

export function UserManagementView({ initialUsers, currentUserId }: Props) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUserListItem | null>(null);

  const users = initialUsers;

  const activeAdminCount = useMemo(
    () => users.filter((u) => u.role === UserRole.ADMIN && u.isActive).length,
    [users],
  );

  const soleAdmin = activeAdminCount === 1;

  const createForm = useForm<CreateForm>({
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

  const editForm = useForm<EditForm>({
    resolver: zodResolver(adminUpdateUserSchema),
    defaultValues: {
      userId: "",
      name: "",
      email: "",
      isActive: true,
      role: UserRole.USER,
      newTemporaryPassword: "",
      adminNote: "",
    },
  });

  function openEdit(u: AdminUserListItem) {
    setEditUser(u);
    editForm.reset({
      userId: u.id,
      name: u.name ?? "",
      email: u.email,
      isActive: u.isActive,
      role: u.role === UserRole.ADMIN ? UserRole.ADMIN : UserRole.USER,
      newTemporaryPassword: "",
      adminNote: u.adminNote ?? "",
    });
  }

  async function onCreate(values: CreateForm) {
    const res = await createUserAdminAction(values);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Kullanıcı oluşturuldu");
    setCreateOpen(false);
    createForm.reset({
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
    });
    router.refresh();
  }

  async function onEdit(values: EditForm) {
    const res = await updateUserAdminAction(values);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Kullanıcı güncellendi");
    setEditUser(null);
    router.refresh();
  }

  async function onToggleActive(u: AdminUserListItem, next: boolean) {
    if (u.id === currentUserId && !next) {
      toast.error("Kendi hesabınızı pasif yapamazsınız");
      return;
    }
    const res = await setUserActiveAdminAction(u.id, next);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(next ? "Hesap aktifleştirildi" : "Hesap pasifleştirildi");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button type="button" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Yeni kullanıcı
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Yeni kullanıcı</DialogTitle>
              <DialogDescription>
                Geçici şifre ile oluşturulur; kullanıcı ilk girişte kalıcı şifre belirler.
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreate)} className="space-y-4">
                <FormField
                  control={createForm.control}
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
                  control={createForm.control}
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
                  control={createForm.control}
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
                <FormField
                  control={createForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border/60 p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Hesap aktif</FormLabel>
                        <FormDescription>Pasif hesaplar giriş yapamaz</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit">Oluştur</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/70 shadow-soft">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Ad</TableHead>
                <TableHead>E-posta</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>İlk şifre</TableHead>
                <TableHead>Oluşturma</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const isSelf = u.id === currentUserId;
                const disableDeactivate = isSelf || (u.role === UserRole.ADMIN && soleAdmin && u.isActive);
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      {u.role === UserRole.ADMIN ? (
                        <Badge variant="default" className="bg-primary/90">
                          Yönetici
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Kullanıcı</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {u.isActive ? (
                          <Badge variant="outline" className="border-emerald-500/40 text-emerald-600">
                            Aktif
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-500/40 text-amber-700">
                            Pasif
                          </Badge>
                        )}
                        <Switch
                          checked={u.isActive}
                          disabled={disableDeactivate && u.isActive}
                          onCheckedChange={(v) => void onToggleActive(u, v)}
                          aria-label={`${u.email} aktiflik`}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      {u.mustChangePassword ? (
                        <span className="text-xs text-amber-600">Bekliyor</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Tamam</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDt(u.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button type="button" variant="ghost" size="sm" className="gap-1" onClick={() => openEdit(u)}>
                        <Pencil className="h-3.5 w-3.5" />
                        Düzenle
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Kullanıcıyı düzenle</DialogTitle>
            <DialogDescription>Profil bilgileri, rol ve geçici şifre sıfırlama.</DialogDescription>
          </DialogHeader>
          {editUser && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEdit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="userId"
                  render={({ field }) => <input type="hidden" {...field} />}
                />
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
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={editUser.id === currentUserId && soleAdmin}
                      >
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
                      {editUser.id === currentUserId && soleAdmin ? (
                        <FormDescription>Son yönetici olduğunuz için rol düşürülemez.</FormDescription>
                      ) : null}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border/60 p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Hesap aktif</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={editUser.id === currentUserId}
                        />
                      </FormControl>
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
                      <FormDescription>
                        Doldurursanız kullanıcı bir sonraki girişte yeni şifre belirlemek zorunda kalır.
                      </FormDescription>
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
                        <Textarea
                          placeholder="İç not"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit">Kaydet</Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
