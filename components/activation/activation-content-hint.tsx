"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

type Props = {
  /** Sunucudan `?activation=quickstart` ile gelir */
  show: boolean;
};

export function ActivationContentHint({ show }: Props) {
  const fired = useRef(false);

  useEffect(() => {
    if (!show || fired.current) return;
    fired.current = true;
    toast.info("Gruplarda paylaşımı aşağıdan başlatabilirsin.", { duration: 6000 });
  }, [show]);

  return null;
}
