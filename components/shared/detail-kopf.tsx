import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Kopf einer Detailseite (Schülerakte, Rechnung, Fahrzeug …): kleiner
 * Zurück-Link zur Liste, darunter Bild, Titel (20/600), Status und eine
 * Meta-Zeile; rechts die Aktionen dieses Datensatzes.
 */
export function DetailKopf({
  zurueck,
  bild,
  titel,
  status,
  meta,
  aktionen,
  children,
  className,
}: {
  zurueck?: { href: string; label: string };
  bild?: React.ReactNode;
  titel: React.ReactNode;
  status?: React.ReactNode;
  /** Einzelteile der Meta-Zeile, werden mit „·" verbunden; leere fallen weg. */
  meta?: React.ReactNode[];
  aktionen?: React.ReactNode;
  /** Zusatzzeile unter dem Kopf (z. B. Fortschrittsleiste). */
  children?: React.ReactNode;
  className?: string;
}) {
  const teile = (meta ?? []).filter((m) => m != null && m !== false && m !== "");

  return (
    <div data-page-header className={cn("mb-6", className)}>
      {zurueck && (
        <Link
          href={zurueck.href}
          className="mb-3 inline-flex items-center gap-1.5 text-13 text-foreground-secondary transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
          {zurueck.label}
        </Link>
      )}

      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 items-center gap-3.5">
          {bild}
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
              <h1 className="truncate text-title font-semibold text-foreground">{titel}</h1>
              {status}
            </div>
            {teile.length > 0 && (
              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-13 text-foreground-secondary">
                {teile.map((t, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && (
                      <span aria-hidden="true" className="text-foreground-tertiary">
                        ·
                      </span>
                    )}
                    <span className="whitespace-nowrap">{t}</span>
                  </React.Fragment>
                ))}
              </p>
            )}
          </div>
        </div>

        {aktionen && <div className="flex shrink-0 flex-wrap items-center gap-2 print:hidden">{aktionen}</div>}
      </div>

      {children}
    </div>
  );
}
