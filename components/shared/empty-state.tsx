import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Leerzustand v3: EIN Satz plus der nächste Schritt. Icon 20 px ohne
 * Kachel, ohne Kreis, ohne Fläche – die v2-Icon-Kachel entfällt.
 *
 * `panel` = eigene Fläche mit Schatten (Default, damit bestehende Aufrufe
 * weiter als Fläche wirken), `inline` = ohne Fläche für Tabellen, Panels
 * und Seitenpanels.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  children,
  variant = "panel",
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  variant?: "panel" | "inline";
  className?: string;
}) {
  const inhalt = action ?? children;
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 text-center",
        variant === "panel"
          ? "rounded-xl bg-card py-14 shadow-panel print:shadow-none print:ring-1 print:ring-border"
          : "py-10",
        className,
      )}
    >
      <Icon className="h-5 w-5 text-foreground-tertiary" strokeWidth={1.75} aria-hidden="true" />
      <h3 className="mt-3 text-sm font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1 max-w-[380px] text-13 text-muted-foreground">{description}</p>}
      {inhalt && <div className="mt-4 flex flex-wrap justify-center gap-2">{inhalt}</div>}
    </div>
  );
}
