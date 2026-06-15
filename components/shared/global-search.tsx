"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Search, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { globalSuche, kiSuche, type SuchTreffer } from "@/app/(dashboard)/such-actions";

// ---------------------------------------------------------------------------
// Gruppenbezeichnungen je Typ
// ---------------------------------------------------------------------------
const GRUPPENBEZEICHNUNG: Record<SuchTreffer["typ"], string> = {
  schueler: "Schüler",
  benutzer: "Benutzer",
  fahrzeug: "Fahrzeuge",
  rechnung: "Rechnungen",
};

const REIHENFOLGE: SuchTreffer["typ"][] = ["schueler", "benutzer", "fahrzeug", "rechnung"];

// ---------------------------------------------------------------------------
// Hilfsfunktion: Treffer nach Typ gruppieren (in definierter Reihenfolge)
// ---------------------------------------------------------------------------
function gruppiereNachTyp(treffer: SuchTreffer[]): { typ: SuchTreffer["typ"]; eintraege: SuchTreffer[] }[] {
  const map = new Map<SuchTreffer["typ"], SuchTreffer[]>();
  for (const t of treffer) {
    const gruppe = map.get(t.typ) ?? [];
    gruppe.push(t);
    map.set(t.typ, gruppe);
  }
  return REIHENFOLGE.filter((typ) => map.has(typ)).map((typ) => ({
    typ,
    eintraege: map.get(typ)!,
  }));
}

// ---------------------------------------------------------------------------
// Komponente
// ---------------------------------------------------------------------------

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [treffer, setTreffer] = useState<SuchTreffer[]>([]);
  const [kiAntwort, setKiAntwort] = useState<string | undefined>(undefined);
  const [offen, setOffen] = useState(false);
  const [hatGesucht, setHatGesucht] = useState(false);

  const [suchPending, startSuche] = useTransition();
  const [kiPending, startKi] = useTransition();

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Stale-result-Schutz: letzte abgeschickte Query merken
  const letzteQueryRef = useRef<string>("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------------------------------------------------------------------------
  // Dropdown schließen
  // ---------------------------------------------------------------------------
  const schliessen = useCallback(() => {
    setOffen(false);
    setKiAntwort(undefined);
  }, []);

  // Außen-Klick-Listener
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        schliessen();
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [schliessen]);

  // ---------------------------------------------------------------------------
  // Debounced Suche (250 ms)
  // ---------------------------------------------------------------------------
  const fuehereSucheAus = useCallback(
    (wert: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (wert.trim().length < 2) {
        setTreffer([]);
        setHatGesucht(false);
        setOffen(false);
        return;
      }

      debounceRef.current = setTimeout(() => {
        const aktuelleQuery = wert;
        letzteQueryRef.current = aktuelleQuery;

        startSuche(async () => {
          const ergebnis = await globalSuche(aktuelleQuery);
          // Veraltete Antworten verwerfen
          if (letzteQueryRef.current !== aktuelleQuery) return;
          setTreffer(ergebnis);
          setHatGesucht(true);
          setOffen(true);
          setKiAntwort(undefined);
        });
      }, 250);
    },
    [startSuche],
  );

  function onInput(e: React.ChangeEvent<HTMLInputElement>) {
    const wert = e.target.value;
    setQuery(wert);
    fuehereSucheAus(wert);
  }

  // ---------------------------------------------------------------------------
  // Enter → KI-Suche
  // ---------------------------------------------------------------------------
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      schliessen();
      inputRef.current?.blur();
      return;
    }

    if (e.key === "Enter" && query.trim().length >= 2) {
      e.preventDefault();
      const aktuelleQuery = query;
      letzteQueryRef.current = aktuelleQuery;

      startKi(async () => {
        const ergebnis = await kiSuche(aktuelleQuery);
        if (letzteQueryRef.current !== aktuelleQuery) return;
        setTreffer(ergebnis.treffer);
        setHatGesucht(true);
        setOffen(true);
        setKiAntwort(ergebnis.kiAntwort);
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rendern
  // ---------------------------------------------------------------------------
  const gruppen = gruppiereNachTyp(treffer);
  const istLadend = suchPending || kiPending;

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      {/* Suchfeld */}
      <div
        className={cn(
          "flex h-10 items-center gap-2 rounded-full border bg-muted/60 px-3 transition-colors",
          offen && "bg-card ring-1 ring-ring",
        )}
      >
        {istLadend ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={onInput}
          onKeyDown={onKeyDown}
          onFocus={() => {
            if (hatGesucht && treffer.length > 0) setOffen(true);
          }}
          placeholder="Suche nach Schülern, Fahrzeugen, Rechnungen …"
          className="h-full w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {/* Dropdown */}
      {offen && (
        <div
          className={cn(
            "absolute left-0 right-0 top-[calc(100%+6px)] z-50",
            "max-h-[min(480px,70vh)] overflow-y-auto",
            "rounded-xl border bg-card shadow-lg",
          )}
        >
          {/* KI-Antwort-Banner */}
          {kiAntwort && (
            <div className="flex items-start gap-2 border-b bg-primary/5 px-3 py-2.5">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-sm text-foreground">{kiAntwort}</p>
            </div>
          )}

          {/* KI lädt noch */}
          {kiPending && !kiAntwort && (
            <div className="flex items-center gap-2 border-b bg-primary/5 px-3 py-2.5">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">KI analysiert …</p>
            </div>
          )}

          {/* Keine Treffer */}
          {hatGesucht && treffer.length === 0 && !suchPending && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Keine Treffer</p>
          )}

          {/* Gruppen */}
          {gruppen.map(({ typ, eintraege }) => (
            <div key={typ}>
              {/* Gruppenüberschrift */}
              <p className="px-3 pb-1 pt-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {GRUPPENBEZEICHNUNG[typ]}
              </p>
              {/* Einträge */}
              {eintraege.map((eintrag) => (
                <Link
                  key={eintrag.id}
                  href={eintrag.href}
                  onClick={schliessen}
                  className={cn(
                    "flex flex-col px-3 py-2 text-sm transition-colors",
                    "hover:bg-accent focus:bg-accent focus:outline-none",
                  )}
                >
                  <span className="font-medium text-foreground">{eintrag.titel}</span>
                  {eintrag.untertitel && (
                    <span className="text-xs text-muted-foreground">{eintrag.untertitel}</span>
                  )}
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
