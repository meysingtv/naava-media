"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Search, UserCog } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { ROLLEN } from "@/lib/constants";
import { cn, initialen } from "@/lib/utils";
import type { Fahrlehrer } from "@/lib/types";

export interface TeamKennzahl {
  heuteMinuten: number;
  heuteAnzahl: number;
  wocheMinuten: number;
  wocheAnzahl: number;
  schueler: number;
  fahrzeuge: string[];
}

const TAGESKAPAZITAET = 8 * 60; // Minuten

function kuerzelVon(b: Fahrlehrer): string {
  return b.kuerzel?.trim() || initialen(b.vorname, b.nachname);
}

/**
 * Team-Raster: jede Person als kompakte Kachel mit Tagesauslastung,
 * Wochenstunden, Schülern und Fahrzeugen. Keine Tabelle.
 */
export function TeamGrid({
  benutzer,
  selectedId,
  rollenMap = {},
  kennzahlen,
}: {
  benutzer: Fahrlehrer[];
  selectedId?: string;
  rollenMap?: Record<string, string>;
  kennzahlen: Record<string, TeamKennzahl>;
}) {
  const router = useRouter();
  const [suche, setSuche] = useState("");
  const [archiv, setArchiv] = useState(false);

  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase();
    return benutzer.filter((b) => (archiv ? true : b.aktiv) && (!q || `${b.vorname} ${b.nachname} ${kuerzelVon(b)}`.toLowerCase().includes(q)));
  }, [benutzer, suche, archiv]);

  if (benutzer.length === 0) {
    return (
      <EmptyState icon={UserCog} title="Noch kein Team" description="Lege Benutzer an und weise ihnen Rollen zu (Geschäftsführer, Fahrlehrer, Büro).">
        <Button asChild>
          <Link href="/fahrlehrer/neu">
            <Plus /> Neuer Benutzer
          </Link>
        </Button>
      </EmptyState>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={suche} onChange={(e) => setSuche(e.target.value)} placeholder="Team durchsuchen" className="pl-8" />
        </div>
        <button
          type="button"
          onClick={() => setArchiv((v) => !v)}
          className={cn(
            "h-7 rounded-md px-2 text-xs font-medium transition-colors",
            archiv ? "bg-primary-soft text-primary-text" : "text-foreground-secondary hover:bg-foreground/[0.06]",
          )}
        >
          Archivierte anzeigen
        </button>
        <span className="ml-auto text-xs text-muted-foreground">{gefiltert.length} Personen</span>
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {gefiltert.map((b) => {
          const k = kennzahlen[b.id] ?? { heuteMinuten: 0, heuteAnzahl: 0, wocheMinuten: 0, wocheAnzahl: 0, schueler: 0, fahrzeuge: [] };
          const auslastung = Math.min(100, Math.round((k.heuteMinuten / TAGESKAPAZITAET) * 100));
          const aktiv = b.id === selectedId;
          const rolleName = (b.benutzerrolle_id && rollenMap[b.benutzerrolle_id]) || ROLLEN[b.rolle];
          return (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => router.push(`/fahrlehrer?id=${b.id}`)}
                className={cn(
                  "w-full rounded-xl bg-card shadow-panel p-3.5 text-left transition-[border-color,box-shadow] duration-fast hover:border-border-strong",
                  aktiv && "border-primary ring-2 ring-primary/20",
                  !b.aktiv && "opacity-60",
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-foreground text-xs font-semibold text-background">
                    {kuerzelVon(b)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-foreground">
                      {b.vorname} {b.nachname}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {rolleName}
                      {b.fuehrerscheinklassen?.length ? ` · ${b.fuehrerscheinklassen.join(" ")}` : ""}
                      {!b.aktiv ? " · archiviert" : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-right">
                    <span className="block text-[13px] font-semibold tabular-nums text-foreground">{auslastung}%</span>
                    <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">heute</span>
                  </span>
                </div>

                {/* Tagesauslastung */}
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className={cn("h-full rounded-full", auslastung >= 90 ? "bg-warning" : "bg-primary")}
                    style={{ width: `${auslastung}%` }}
                  />
                </div>

                <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Heute</dt>
                    <dd className="font-medium tabular-nums text-foreground">{k.heuteAnzahl} Std.</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Woche</dt>
                    <dd className="font-medium tabular-nums text-foreground">{(k.wocheMinuten / 60).toFixed(1)} h</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Schüler</dt>
                    <dd className="font-medium tabular-nums text-foreground">{k.schueler}</dd>
                  </div>
                </dl>
                {k.fahrzeuge.length > 0 && (
                  <p className="mt-2 truncate text-xs text-muted-foreground">
                    <span className="text-foreground-secondary">Fahrzeuge:</span> {k.fahrzeuge.join(", ")}
                  </p>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
