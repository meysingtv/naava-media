"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Users } from "lucide-react";

import { Input } from "@/components/ui/input";
import { SchuelerAvatar } from "@/components/shared/schueler-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { cn, formatEuro } from "@/lib/utils";
import type { Fahrschueler } from "@/lib/types";

export function SchuelerListe({
  schueler,
  selectedId,
  saldoMap,
}: {
  schueler: Fahrschueler[];
  selectedId?: string;
  saldoMap: Record<string, number>;
}) {
  const [suche, setSuche] = useState("");

  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase();
    if (!q) return schueler;
    return schueler.filter(
      (s) =>
        `${s.vorname} ${s.nachname}`.toLowerCase().includes(q) ||
        (s.kundennummer != null && String(s.kundennummer).includes(q)),
    );
  }, [schueler, suche]);

  if (schueler.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Noch keine Schüler"
        description="Lege deinen ersten Fahrschüler an, um Fortschritt, Fahrstunden und Rechnungen zu verwalten."
      />
    );
  }

  return (
    <div>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
          placeholder="Suchen (Name, Nr.) …"
          className="pl-9"
        />
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <ul className="max-h-[calc(100vh-15rem)] divide-y overflow-y-auto">
          {gefiltert.map((s) => {
            const aktiv = s.id === selectedId;
            const saldo = saldoMap[s.id] ?? 0;
            return (
              <li key={s.id}>
                <Link
                  href={`/schueler?id=${s.id}`}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 transition-colors",
                    aktiv ? "bg-accent" : "hover:bg-muted/50",
                  )}
                >
                  <SchuelerAvatar
                    vorname={s.vorname}
                    nachname={s.nachname}
                    farbe={s.avatar_farbe}
                    className="h-9 w-9 text-xs"
                  />
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate text-sm", aktiv ? "font-semibold" : "font-medium")}>
                      {s.vorname} {s.nachname}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.fuehrerscheinklassen?.join(" · ") || "Keine Klasse"}
                    </p>
                  </div>
                  {saldo !== 0 && (
                    <span
                      className={cn(
                        "shrink-0 text-xs font-medium",
                        saldo < 0 ? "text-destructive" : "text-success",
                      )}
                    >
                      {formatEuro(saldo)}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
          {gefiltert.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">Keine Treffer.</li>
          )}
        </ul>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {gefiltert.length} von {schueler.length} angezeigt
      </p>
    </div>
  );
}
