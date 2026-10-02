"use client";

import * as React from "react";

import { FUEHRERSCHEINKLASSEN } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Führerscheinklassen als Schalter-Chips. Für Formulare trägt je gewählte
 * Klasse ein verstecktes Feld `name` den Wert (mehrfach, wie ein
 * Mehrfach-Select), damit die Server-Aktionen `getAll(name)` lesen können.
 */
export function KlassenAuswahl({
  name = "klassen",
  defaultValue = [],
  label = "Führerscheinklassen",
}: {
  name?: string;
  defaultValue?: string[] | null;
  label?: string;
}) {
  const [klassen, setKlassen] = React.useState<string[]>(defaultValue ?? []);

  function umschalten(k: string) {
    setKlassen((vorher) => (vorher.includes(k) ? vorher.filter((x) => x !== k) : [...vorher, k]));
  }

  return (
    <div>
      {klassen.map((k) => (
        <input key={k} type="hidden" name={name} value={k} />
      ))}
      <p className="mb-1.5 text-13 font-medium text-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
        {FUEHRERSCHEINKLASSEN.map((k) => {
          const aktiv = klassen.includes(k);
          return (
            <button
              key={k}
              type="button"
              onClick={() => umschalten(k)}
              aria-pressed={aktiv}
              className={cn(
                "h-8 min-w-[44px] rounded-md border px-2.5 text-13 font-semibold transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
                aktiv
                  ? "border-primary bg-primary-soft text-primary-text"
                  : "border-border-strong bg-card text-foreground-secondary hover:bg-surface-muted hover:text-foreground",
              )}
            >
              {k}
            </button>
          );
        })}
      </div>
    </div>
  );
}
