import type { LucideIcon } from "lucide-react";

import { KpiCard } from "@/components/ui/kpi-card";

/**
 * Kennzahl v3 – Hülle um `KpiCard`, damit alle bestehenden Aufrufe ohne
 * Änderung die neue Optik bekommen. `iconClassName` wird zum Ton,
 * `hint` zur Kontextzeile; `icon` wird bewusst IGNORIERT – KPI-Karten
 * tragen in v3 kein Icon.
 */
export function StatCard({
  label,
  value,
  iconClassName,
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  iconClassName?: string;
  hint?: React.ReactNode;
  className?: string;
}) {
  const ton = iconClassName?.includes("success")
    ? "success"
    : iconClassName?.includes("warning")
      ? "warning"
      : iconClassName?.includes("destructive")
        ? "destructive"
        : "neutral";

  return <KpiCard label={label} value={value} sub={hint} tone={ton} className={className} />;
}
