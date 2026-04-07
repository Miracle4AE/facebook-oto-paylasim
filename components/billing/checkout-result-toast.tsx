"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function CheckoutResultToast() {
  const sp = useSearchParams();
  const router = useRouter();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    const c = sp.get("checkout");
    if (c === "success") {
      done.current = true;
      toast.success("Ödeme başarılı — planın güncellendi.");
      router.replace("/dashboard");
      router.refresh();
    } else if (c === "cancelled") {
      done.current = true;
      toast.error("Ödeme iptal edildi veya tamamlanmadı.");
      router.replace("/dashboard");
    }
  }, [sp, router]);

  return null;
}
