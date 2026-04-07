"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DISPLAY_MONTHLY_PRICES_TRY, PLAN_MARKETING } from "@/lib/billing/limits";
import { SubscriptionPlanCode } from "@/types/domain";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: string;
};

const PAID_PLANS = [SubscriptionPlanCode.BASIC, SubscriptionPlanCode.PRO, SubscriptionPlanCode.PREMIUM] as const;

export function PlanComparisonModal({ open, onOpenChange, reason }: Props) {
  const [stripeReady, setStripeReady] = useState<boolean | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (stripeReady !== null) return;
    void (async () => {
      try {
        const r = await fetch("/api/stripe/checkout/status", { credentials: "include" });
        const j = (await r.json()) as { ready?: boolean };
        setStripeReady(Boolean(j.ready));
      } catch {
        setStripeReady(false);
      }
    })();
  }, [open, stripeReady]);

  const startCheckout = useCallback(
    async (planCode: string) => {
      setLoadingPlan(planCode);
      try {
        const r = await fetch("/api/stripe/checkout", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planCode }),
        });
        const j = (await r.json()) as { ok?: boolean; url?: string; error?: string };
        if (!r.ok || !j.ok) {
          toast.error(j.error ?? "Ödeme oturumu açılamadı");
          return;
        }
        if (j.url) {
          window.location.href = j.url;
          return;
        }
        toast.error("Yönlendirme adresi alınamadı");
      } catch {
        toast.error("Bağlantı hatası");
      } finally {
        setLoadingPlan(null);
      }
    },
    [],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Planları karşılaştır</DialogTitle>
          <DialogDescription>
            {reason ?? "Daha fazla gruba ulaşmak ve sınırları kaldırmak için uygun planı seç."}
          </DialogDescription>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Ödeme Stripe üzerinden güvenli şekilde alınır. Fiyatlar aylık abonelik; KDV ve kampanya kodları ödeme
          ekranında yansır.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {PLAN_MARKETING.map((p) => {
            const isPaid = (PAID_PLANS as readonly string[]).includes(p.code);
            const priceLabel =
              p.code === SubscriptionPlanCode.BASIC
                ? DISPLAY_MONTHLY_PRICES_TRY[SubscriptionPlanCode.BASIC]
                : p.code === SubscriptionPlanCode.PRO
                  ? DISPLAY_MONTHLY_PRICES_TRY[SubscriptionPlanCode.PRO]
                  : p.code === SubscriptionPlanCode.PREMIUM
                    ? DISPLAY_MONTHLY_PRICES_TRY[SubscriptionPlanCode.PREMIUM]
                    : null;

            return (
              <div
                key={p.code}
                className={cn(
                  "flex flex-col rounded-lg border p-4 text-sm",
                  p.highlight ? "border-primary/50 bg-primary/5" : "border-border bg-muted/20",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{p.name}</span>
                  {p.highlight && (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                      En çok tercih edilen
                    </span>
                  )}
                </div>
                {isPaid && priceLabel && (
                  <p className="mt-2 text-sm font-medium leading-none text-foreground">{priceLabel}</p>
                )}
                <p className="mt-1 text-muted-foreground">{p.blurb}</p>
                {p.socialProof && (
                  <p className="mt-2 text-xs italic leading-snug text-muted-foreground">{p.socialProof}</p>
                )}
                <ul className="mt-3 space-y-1.5 text-xs text-foreground/90">
                  <li>· {p.groupLabel}</li>
                  <li>· {p.flowLabel}</li>
                </ul>
                {isPaid && (
                  <div className="mt-4">
                    <Button
                      type="button"
                      size="sm"
                      className="w-full gap-2"
                      disabled={stripeReady === false || loadingPlan !== null}
                      onClick={() => void startCheckout(p.code)}
                    >
                      {loadingPlan === p.code ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Yönlendiriliyor
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4" />
                          Daha fazla kişiye ulaş
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {stripeReady === false && (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
            Çevrimiçi ödeme henüz yapılandırılmadı (STRIPE_SECRET_KEY ve STRIPE_PRICE_ID_*). Yönetici ile iletişime geçin.
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
