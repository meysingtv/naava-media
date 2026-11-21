import * as React from "react";

import { cn } from "@/lib/utils";

export interface PanelProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** Panel-Titel – 14/600. Ohne Titel gibt es keinen Kopf. */
  title?: React.ReactNode;
  /** Beschreibung hinter dem Titel, mit „·" abgesetzt. */
  description?: React.ReactNode;
  /** Rechts im Kopf: „Alle"-Link, Button size="sm", Filter. */
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  /** `none` = p-0 für Tabellen und Listen. */
  padding?: "none" | "dense" | "default";
  as?: "section" | "div";
}

/**
 * Panel v3 – die bevorzugte Hülle für alle Inhalte: weiße Fläche,
 * 10-px-Radius, weicher Schatten mit 1-px-Ring. Kein Rahmen an der Fläche;
 * Linien gibt es nur innerhalb (Kopfkante, Zeilen, Fuß).
 */
export function Panel({
  title,
  description,
  actions,
  footer,
  padding = "default",
  as = "section",
  className,
  children,
  ...props
}: PanelProps) {
  const Comp = as;
  const hatKopf = Boolean(title || actions);

  return (
    <Comp
      className={cn(
        "rounded-xl bg-card text-card-foreground shadow-panel print:shadow-none print:ring-1 print:ring-border",
        padding === "none" ? "overflow-hidden" : "",
        className,
      )}
      {...props}
    >
      {hatKopf && (
        <div
          className={cn(
            "flex h-12 items-center justify-between gap-3 px-4",
            // Die Tabelle sitzt direkt darunter – dann braucht der Kopf eine Kante.
            padding === "none" && "border-b border-border",
          )}
        >
          <div className="flex min-w-0 items-baseline gap-2">
            {title && <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>}
            {description && (
              <span className="hidden truncate text-xs text-muted-foreground sm:block">· {description}</span>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}

      <div
        className={cn(
          padding === "default" && (hatKopf ? "px-4 pb-4 pt-0" : "p-4"),
          padding === "dense" && (hatKopf ? "px-3 pb-3 pt-0" : "p-3"),
          padding === "none" && "p-0",
        )}
      >
        {children}
      </div>

      {footer && (
        <div className="flex items-center gap-2 border-t border-border px-4 py-3">{footer}</div>
      )}
    </Comp>
  );
}

/** Unterabschnitt innerhalb eines Panels – für gestapelte Blöcke ohne eigene Fläche. */
export function PanelSection({
  title,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { title?: React.ReactNode }) {
  return (
    <div className={cn("border-b border-border px-4 py-3 last:border-0", className)} {...props}>
      {title && <p className="label-caps mb-2">{title}</p>}
      {children}
    </div>
  );
}
