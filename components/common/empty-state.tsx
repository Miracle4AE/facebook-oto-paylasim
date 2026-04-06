import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
  action?: React.ReactNode;
  /** Varsayılan: marka vurgusu; hata / uyarı için destructive veya muted. */
  tone?: "default" | "destructive" | "muted";
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
  action,
  tone = "default",
}: Props) {
  const iconTone =
    tone === "destructive"
      ? "bg-destructive/10 text-destructive"
      : tone === "muted"
        ? "bg-muted text-muted-foreground"
        : "bg-primary/10 text-primary";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/40 px-6 py-16 text-center",
        className,
      )}
    >
      <div className={cn("mb-4 flex h-12 w-12 items-center justify-center rounded-2xl", iconTone)}>
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
