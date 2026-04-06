"use client";

import { Fragment } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { UnifiedLogItem, UnifiedLogQuery } from "@/services/admin/admin-logs.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Props = {
  items: UnifiedLogItem[];
  params: UnifiedLogQuery;
};

function buildQs(p: UnifiedLogQuery) {
  const qs = new URLSearchParams();
  qs.set("take", String(p.take));
  qs.set("skip", String(p.skip));
  if (p.from) qs.set("from", p.from.toISOString());
  if (p.to) qs.set("to", p.to.toISOString());
  if (p.source && p.source !== "all") qs.set("source", p.source);
  if (p.level && p.level !== "all") qs.set("level", p.level);
  if (p.userEmail) qs.set("user", p.userEmail);
  if (p.search) qs.set("q", p.search);
  if (p.targetSearch) qs.set("hedef", p.targetSearch);
  return qs.toString();
}

export function AdminLogsView({ items, params: initial }: Props) {
  const router = useRouter();
  const [openRow, setOpenRow] = useState<string | null>(null);

  function apply(patch: Partial<UnifiedLogQuery>) {
    const next = { ...initial, ...patch, skip: patch.skip ?? 0 };
    router.push(`/admin/loglar?${buildQs(next)}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Loglar</h1>
        <p className="text-sm text-muted-foreground">
          Yayın logları ve yönetici denetim kayıtları birleşik görünüm.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label>Kaynak</Label>
              <Select
                value={initial.source ?? "all"}
                onValueChange={(v) => apply({ source: v as UnifiedLogQuery["source"], skip: 0 })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="publish">Yayın</SelectItem>
                  <SelectItem value="admin_audit">Yönetici</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Seviye</Label>
              <Select
                value={initial.level ?? "all"}
                onValueChange={(v) => apply({ level: v as UnifiedLogQuery["level"], skip: 0 })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="success">Başarı</SelectItem>
                  <SelectItem value="error">Hata</SelectItem>
                  <SelectItem value="info">Bilgi</SelectItem>
                  <SelectItem value="warn">Uyarı</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Kullanıcı e-posta</Label>
              <Input
                defaultValue={initial.userEmail ?? ""}
                placeholder="ara…"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    apply({ userEmail: (e.target as HTMLInputElement).value.trim() || undefined, skip: 0 });
                  }
                }}
              />
            </div>
            <div className="space-y-1">
              <Label>Metin arama</Label>
              <Input
                defaultValue={initial.search ?? ""}
                placeholder="mesaj / aksiyon"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    apply({ search: (e.target as HTMLInputElement).value.trim() || undefined, skip: 0 });
                  }
                }}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => apply({ skip: Math.max(0, initial.skip - initial.take) })}>
              Önceki
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => apply({ skip: initial.skip + initial.take })}>
              Sonraki
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-xl border border-border/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Zaman</TableHead>
              <TableHead>Tür</TableHead>
              <TableHead>Seviye</TableHead>
              <TableHead>Özet</TableHead>
              <TableHead>Kullanıcı</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  Kayıt yok.
                </TableCell>
              </TableRow>
            ) : (
              items.map((row) => (
                <Fragment key={row.id}>
                  <TableRow className="align-top">
                    <TableCell className="whitespace-nowrap text-xs">
                      {format(row.createdAt, "d MMM yyyy HH:mm:ss", { locale: tr })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.source === "publish" ? "Yayın" : "Denetim"}</Badge>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "text-xs font-medium",
                          row.level === "error" && "text-destructive",
                          row.level === "success" && "text-emerald-600",
                        )}
                      >
                        {row.level}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="line-clamp-2 text-sm">{row.summary}</div>
                      {row.fbTraceId ? (
                        <div className="mt-1 font-mono text-[10px] text-muted-foreground">fbtrace_id: {row.fbTraceId}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.userEmail ?? row.actorEmail ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setOpenRow((x) => (x === row.id ? null : row.id))}>
                        {openRow === row.id ? "Gizle" : "Detay"}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {openRow === row.id ? (
                    <TableRow key={`${row.id}-detail`}>
                      <TableCell colSpan={6} className="bg-muted/20">
                        <div className="space-y-2 p-3 text-sm">
                          <p>
                            <span className="text-muted-foreground">Başlık:</span> {row.title}
                          </p>
                          {row.targetChannelName ? (
                            <p>
                              <span className="text-muted-foreground">Hedef:</span> {row.targetChannelName}
                            </p>
                          ) : null}
                          {row.contentTitle ? (
                            <p>
                              <span className="text-muted-foreground">İçerik:</span> {row.contentTitle}
                            </p>
                          ) : null}
                          <details className="rounded-md border border-border/50 bg-background p-2">
                            <summary className="cursor-pointer text-xs font-medium">Gelişmiş detay</summary>
                            <pre className="mt-2 max-h-48 overflow-auto text-[10px] leading-relaxed">
                              {row.technicalDetail ?? row.metaJson ?? "—"}
                            </pre>
                          </details>
                          <Button variant="link" className="h-auto p-0 text-xs" asChild>
                            <Link href="/admin/kullanicilar">Kullanıcı listesi</Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
