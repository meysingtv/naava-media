import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/utils";

export interface RolleEintrag {
  key: string;
  id: string | null;
  name: string;
  beschreibung: string | null;
  zugangsart: string | null;
  web_zugang: boolean;
  system: boolean;
}

/** Alle Rollen – Standardrollen oben, eigene darunter; die gewählte ist hervorgehoben. */
export function RollenListe({
  eintraege,
  selectedKey,
  anzahl,
}: {
  eintraege: RolleEintrag[];
  selectedKey?: string;
  /** Mitarbeiter je Rolle. */
  anzahl: Record<string, number>;
}) {
  const gruppen = [
    { titel: "Standardrollen", liste: eintraege.filter((e) => e.system) },
    { titel: "Eigene Rollen", liste: eintraege.filter((e) => !e.system) },
  ];

  return (
    <Panel padding="none">
      {gruppen.map((g) => (
        <section key={g.titel} aria-label={g.titel}>
          <h3 className="border-b border-border bg-surface-muted/60 px-4 py-1.5 text-xs font-semibold text-foreground-secondary">{g.titel}</h3>
          {g.liste.length === 0 ? (
            <p className="px-4 py-6 text-13 text-foreground-secondary">Noch keine eigene Rolle angelegt.</p>
          ) : (
            <ul className="divide-y divide-border border-b border-border last:border-b-0">
              {g.liste.map((e) => {
                const aktiv = e.key === selectedKey;
                const n = anzahl[e.key] ?? 0;
                return (
                  <li key={e.key}>
                    <Link
                      href={`/fahrlehrer/rollen?rolle=${e.key}`}
                      aria-current={aktiv ? "true" : undefined}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 transition-colors",
                        aktiv ? "bg-primary-soft/70" : "hover:bg-surface-muted/60",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                          aktiv ? "bg-card text-primary-text" : "bg-muted text-foreground-secondary",
                        )}
                      >
                        <ShieldCheck className="h-4 w-4" strokeWidth={1.75} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-13 font-semibold text-foreground">{e.name}</span>
                          {e.system && <Badge variant="secondary">Standard</Badge>}
                        </span>
                        <span className="block truncate text-xs text-foreground-secondary">{e.beschreibung || "Ohne Beschreibung"}</span>
                      </span>
                      <span className="shrink-0 text-right text-xs tabular-nums text-foreground-tertiary">
                        {n} {n === 1 ? "Person" : "Personen"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}
    </Panel>
  );
}
