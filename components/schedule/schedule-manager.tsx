"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { deleteScheduleSlot, upsertScheduleSlot } from "@/actions/schedule";
import { scheduleSlotSchema } from "@/lib/validations";
import { ScheduleRecurrence } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

type Content = { id: string; title: string | null; body: string; status: string };
type Target = { id: string; name: string };
type Slot = {
  id: string;
  contentPostId: string;
  contentTitle: string | null;
  timezone: string;
  recurrence: string;
  timesOfDay: string;
  daysOfWeek: string | null;
  targetChannelIds: string;
  isActive: boolean;
};

const timezones = ["Europe/Istanbul", "Europe/Berlin", "UTC", "America/New_York"];

const formSchema = scheduleSlotSchema;
type FormValues = z.infer<typeof formSchema>;

function parseJsonArray(raw: string): string[] {
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function ScheduleManager({
  contents,
  targets,
  slots,
}: {
  contents: Content[];
  targets: Target[];
  slots: Slot[];
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<Slot | null>(null);
  const [timeInput, setTimeInput] = useState("09:00");

  const selectableContents = useMemo(
    () => contents.filter((c) => c.status === "SCHEDULED" || c.status === "DRAFT"),
    [contents],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contentPostId: selectableContents[0]?.id ?? "",
      timezone: "Europe/Istanbul",
      recurrence: ScheduleRecurrence.DAILY,
      scheduledAt: null,
      timesOfDay: ["09:30", "18:00"],
      daysOfWeek: [1, 2, 3, 4, 5],
      targetChannelIds: targets.map((t) => t.id),
      isActive: true,
    },
  });

  const recurrence = form.watch("recurrence");
  const selectedTargets = form.watch("targetChannelIds");

  async function onSubmit(values: FormValues) {
    const res = await upsertScheduleSlot(undefined, values);
    if (!res.ok) {
      toast.error(res.error ?? "Kaydedilemedi");
      return;
    }
    toast.success("Zamanlama kaydedildi");
    form.reset({
      ...values,
      timesOfDay: values.timesOfDay,
    });
    router.refresh();
  }

  async function onDelete() {
    if (!deleting) return;
    const res = await deleteScheduleSlot(deleting.id);
    if (!res.ok) {
      toast.error(res.error ?? "Silinemedi");
      return;
    }
    toast.success("Zamanlama silindi");
    setDeleting(null);
    router.refresh();
  }

  function toggleTarget(id: string, checked: boolean) {
    const current = form.getValues("targetChannelIds");
    if (checked) {
      form.setValue("targetChannelIds", Array.from(new Set([...current, id])));
    } else {
      form.setValue(
        "targetChannelIds",
        current.filter((x) => x !== id),
      );
    }
  }

  function addTime() {
    if (!/^\d{2}:\d{2}$/.test(timeInput)) {
      toast.error("Saat SS:dd formatında olmalı");
      return;
    }
    const current = form.getValues("timesOfDay");
    if (current.includes(timeInput)) return;
    form.setValue("timesOfDay", [...current, timeInput].sort());
  }

  function removeTime(t: string) {
    form.setValue(
      "timesOfDay",
      form.getValues("timesOfDay").filter((x) => x !== t),
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Zamanlama</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Günlük saatleri ve hedef kanalları seçin. Cron işi Vercel üzerinde yapılandırılabilir.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Yeni zamanlama kuralı</CardTitle>
          <CardDescription>İçerik planlandığında otomatik olarak planlı duruma alınır.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="contentPostId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>İçerik</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {selectableContents.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.title ?? "Başlıksız"}
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
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Saat dilimi</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {timezones.map((tz) => (
                            <SelectItem key={tz} value={tz}>
                              {tz}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="recurrence"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tekrar</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={ScheduleRecurrence.ONCE}>Tek sefer</SelectItem>
                          <SelectItem value={ScheduleRecurrence.DAILY}>Günlük</SelectItem>
                          <SelectItem value={ScheduleRecurrence.WEEKLY}>Haftalık</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {recurrence === ScheduleRecurrence.ONCE ? (
                <FormField
                  control={form.control}
                  name="scheduledAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tarih ve saat</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""} onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}

              <div className="space-y-2">
                <Label>Saatler (SS:dd)</Label>
                <div className="flex flex-wrap gap-2">
                  {form.watch("timesOfDay").map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => removeTime(t)}
                      className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs"
                    >
                      {t} ×
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={timeInput} onChange={(e) => setTimeInput(e.target.value)} placeholder="09:30" />
                  <Button type="button" variant="secondary" onClick={addTime}>
                    Ekle
                  </Button>
                </div>
              </div>

              {recurrence === ScheduleRecurrence.WEEKLY ? (
                <FormField
                  control={form.control}
                  name="daysOfWeek"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Haftanın günleri (ISO)</FormLabel>
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                        {[
                          { v: 1, l: "Pzt" },
                          { v: 2, l: "Sal" },
                          { v: 3, l: "Çar" },
                          { v: 4, l: "Per" },
                          { v: 5, l: "Cum" },
                          { v: 6, l: "Cmt" },
                          { v: 7, l: "Paz" },
                        ].map((d) => {
                          const checked = field.value?.includes(d.v) ?? false;
                          return (
                            <label key={d.v} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(c) => {
                                  const set = new Set(field.value ?? []);
                                  if (c) set.add(d.v);
                                  else set.delete(d.v);
                                  field.onChange(Array.from(set).sort((a, b) => a - b));
                                }}
                              />
                              {d.l}
                            </label>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}

              <div className="space-y-2">
                <Label>Hedef kanallar</Label>
                <div className="grid gap-2 md:grid-cols-2">
                  {targets.map((t) => (
                    <label key={t.id} className="flex items-center gap-2 rounded-lg border border-border/60 p-2 text-sm">
                      <Checkbox
                        checked={selectedTargets.includes(t.id)}
                        onCheckedChange={(c) => toggleTarget(t.id, Boolean(c))}
                      />
                      {t.name}
                    </label>
                  ))}
                </div>
              </div>

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                    <div>
                      <FormLabel>Aktif</FormLabel>
                      <p className="text-xs text-muted-foreground">Pasif kurallar cron tarafından işlenmez.</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <Button type="submit">Zamanlamayı kaydet</Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mevcut kurallar</CardTitle>
          <CardDescription>Kayıtlı zamanlama slotları</CardDescription>
        </CardHeader>
        <CardContent>
          {slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">Henüz kural yok.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>İçerik</TableHead>
                  <TableHead>Tekrar</TableHead>
                  <TableHead>Saatler</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slots.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-medium">{s.contentTitle ?? "Başlıksız"}</div>
                      <div className="text-xs text-muted-foreground">{s.timezone}</div>
                    </TableCell>
                    <TableCell>{s.recurrence}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{parseJsonArray(s.timesOfDay).join(", ")}</TableCell>
                    <TableCell>{s.isActive ? "Aktif" : "Pasif"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setDeleting(s)}>
                        Sil
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
            <AlertDialogTitle>Kural silinsin mi?</AlertDialogTitle>
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
