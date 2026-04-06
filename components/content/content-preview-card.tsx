"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  body: string;
};

export function ContentPreviewCard({ body }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Önizleme</CardTitle>
        <CardDescription>Metin önizlemesi</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm leading-relaxed text-muted-foreground">
          {body.trim().length > 0 ? body : "Henüz metin yok."}
        </div>
      </CardContent>
    </Card>
  );
}
