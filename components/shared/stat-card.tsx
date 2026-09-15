import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Kennzahl v2: kein Kasten, keine Icon-Kachel. Versalien-Label, große
 * tabellarische Zahl, Hinweis – mit linker Markierungslinie. Über
 * `iconClassName` (Alt-API) wird die Linie eingefärbt (success/warning).
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  iconClassName,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  iconClassName?: string;
  hint?: React.ReactNode;
}) {
  const ton = iconClassName?.includes("success")
    ? "border-success"
    : iconClassName?.includes("warning")
      ? "border-warning"
      : iconClassName?.includes("destructive")
        ? "border-destructive"
        : "border-primary";
  return (
    <div className={cn("flex min-w-0 flex-col gap-1 border-l-2 py-0.5 pl-3", ton)}>
      <p className="label-caps flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3" strokeWidth={2} />}
        {label}
      </p>
      <p className="text-[22px] font-semibold leading-7 tracking-[-0.01em] text-foreground tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
