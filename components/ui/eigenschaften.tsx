import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Eigenschaftsliste: Bezeichnung links (grau), Wert rechts daneben – wie die
 * Eigenschaftsspalte in Linear oder Attio. Ohne Linien zwischen den Zeilen;
 * leere Werte zeigen einen Gedankenstrich.
 */
export function Eigenschaften({
  children,
  className,
  breite = "normal",
}: {
  children: React.ReactNode;
  className?: string;
  /** Breite der Bezeichnungsspalte. */
  breite?: "schmal" | "normal" | "breit";
}) {
  return (
    <dl
      className={cn(
        "grid gap-x-4 gap-y-0",
        breite === "schmal" && "grid-cols-[96px_minmax(0,1fr)]",
        breite === "normal" && "grid-cols-[136px_minmax(0,1fr)]",
        breite === "breit" && "grid-cols-[176px_minmax(0,1fr)]",
        className,
      )}
    >
      {children}
    </dl>
  );
}

export function Eigenschaft({
  label,
  children,
  className,
}: {
  label: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const leer = children == null || children === "" || children === false;
  return (
    <>
      <dt className="py-1.5 text-13 text-foreground-secondary">{label}</dt>
      <dd className={cn("min-w-0 py-1.5 text-13 text-foreground", className)}>
        {leer ? <span className="text-foreground-tertiary">—</span> : children}
      </dd>
    </>
  );
}
