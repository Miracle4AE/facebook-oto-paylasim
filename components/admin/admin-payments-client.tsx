"use client";

import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useState } from "react";
import { createPaymentAdminAction, updatePaymentAdminAction } from "@/actions/admin-payments";
import type { PaymentRow } from "@/services/admin/payment-admin.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type PlanOption = { id: string; code: string; name: string };
type UserOption = { id: string; email: string; name: string | null };

type Props = {
  initialRows: PaymentRow[];
  plans: PlanOption[];
  users: UserOption[];
};

export function AdminPaymentsClient({ initialRows, plans, users }: Props) {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState("");
  const [editStatus, setEditStatus] = useState("PENDING");

  const [userId, setUserId] = useState("");
  const [planId, setPlanId] = useState<string>("none");
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(() => format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [method, setMethod] = useState<"MANUAL" | "STRIPE" | "IYZICO" | "OTHER">("MANUAL");
  const [status, setStatus] = useState<"PENDING" | "COMPLETED" | "FAILED" | "REFUNDED">("COMPLETED");
  const [note, setNote] = useState("");

  async function onCreate() {
    const res = await createPaymentAdminAction({
      userId,
      planId: planId === "none" ? null : planId,
      amount: parseFloat(amount.replace(",", ".")),
      paidAt: new Date(paidAt).toISOString(),
      method,
      status,
      note: note || null,
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Ödeme kaydı eklendi");
    setOpen(false);
    window.location.reload();
  }

  async function onUpdate() {
    if (!editId) return;
    const res = await updatePaymentAdminAction({
      id: editId,
      status: editStatus as "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED",
      note: editNote || null,
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Güncellendi");
    setEditId(null);
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Ödemeler</h1>
          <p className="text-sm text-muted-foreground">Manuel takip; ileride Stripe / iyzico ile uyumlu alanlar.</p>
        </div>
        <Button type="button" onClick={() => setOpen(true)}>
          Manuel ödeme ekle
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kayıtlar</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kullanıcı</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Tutar</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead>Yöntem</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    Kayıt yok.
                  </TableCell>
                </TableRow>
              ) : (
                initialRows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.user.name ?? r.user.email}</TableCell>
                    <TableCell>{r.plan?.name ?? "—"}</TableCell>
                    <TableCell>
                      {r.amount} {r.currency}
                    </TableCell>
                    <TableCell className="text-xs">{format(r.paidAt, "d MMM yyyy HH:mm", { locale: tr })}</TableCell>
                    <TableCell>{r.method}</TableCell>
                    <TableCell>{r.status}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditId(r.id);
                          setEditNote(r.note ?? "");
                          setEditStatus(r.status);
                        }}
                      >
                        Düzenle
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manuel ödeme</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Kullanıcı</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seçin" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Plan (isteğe bağlı)</Label>
              <Select value={planId} onValueChange={setPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tutar (TRY)</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="örn. 999.90" />
            </div>
            <div>
              <Label>Ödeme zamanı</Label>
              <Input type="datetime-local" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
            </div>
            <div>
              <Label>Yöntem</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">Manuel</SelectItem>
                  <SelectItem value="STRIPE">Stripe</SelectItem>
                  <SelectItem value="IYZICO">iyzico</SelectItem>
                  <SelectItem value="OTHER">Diğer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Durum</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Beklemede</SelectItem>
                  <SelectItem value="COMPLETED">Tamamlandı</SelectItem>
                  <SelectItem value="FAILED">Başarısız</SelectItem>
                  <SelectItem value="REFUNDED">İade</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Not</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => void onCreate()} disabled={!userId || !amount}>
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editId !== null} onOpenChange={(o) => !o && setEditId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ödeme güncelle</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Durum</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Beklemede</SelectItem>
                  <SelectItem value="COMPLETED">Tamamlandı</SelectItem>
                  <SelectItem value="FAILED">Başarısız</SelectItem>
                  <SelectItem value="REFUNDED">İade</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Not</Label>
              <Textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => void onUpdate()}>
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
