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

  // ⌘K / Ctrl+K fokussiert die Suche
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

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
    <div ref={containerRef} className="relative w-full">
      {/* Suchfeld */}
      <div
        className={cn(
          "flex h-9 items-center gap-2 rounded-md border border-transparent bg-surface-muted px-2.5 transition-[background-color,border-color,box-shadow] duration-fast ease-soft",
          "hover:bg-surface hover:border-border",
          "focus-within:border-primary focus-within:bg-background focus-within:ring-[3px] focus-within:ring-primary/20",
          offen && "border-primary bg-background ring-[3px] ring-primary/20",
        )}
      >
        {istLadend ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
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
          placeholder="Suchen … Schüler, Fahrzeuge, Rechnungen"
          className="h-full w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none [&::-webkit-search-cancel-button]:appearance-none"
          autoComplete="off"
          spellCheck={false}
        />
        <kbd className="hidden shrink-0 select-none items-center gap-0.5 rounded-[5px] border bg-background px-1.5 py-0.5 font-sans text-2xs font-medium text-muted-foreground lg:inline-flex">
          ⌘K
        </kbd>
      </div>

      {/* Dropdown */}
      {offen && (
        <div
          className={cn(
            "absolute left-0 right-0 top-[calc(100%+6px)] z-50 animate-scale-in origin-top",
            "max-h-[min(480px,70vh)] overflow-y-auto scrollbar-thin",
            "rounded-[10px] border bg-popover p-1 shadow-md",
          )}
        >
          {/* KI-Antwort-Banner */}
          {kiAntwort && (
            <div className="mb-1 flex items-start gap-2.5 rounded-md bg-primary-soft px-3 py-2.5">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-sm text-foreground">{kiAntwort}</p>
            </div>
          )}

          {/* KI lädt noch */}
          {kiPending && !kiAntwort && (
            <div className="mb-1 flex items-center gap-2.5 rounded-md bg-primary-soft px-3 py-2.5">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">KI analysiert …</p>
            </div>
          )}

          {/* Keine Treffer */}
          {hatGesucht && treffer.length === 0 && !suchPending && (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">Keine Treffer</p>
          )}

          {/* Gruppen */}
          {gruppen.map(({ typ, eintraege }) => (
            <div key={typ}>
              {/* Gruppenüberschrift */}
              <p className="px-2.5 pb-1 pt-2 text-2xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                {GRUPPENBEZEICHNUNG[typ]}
              </p>
              {/* Einträge */}
              {eintraege.map((eintrag) => (
                <Link
                  key={eintrag.id}
                  href={eintrag.href}
                  onClick={schliessen}
                  className={cn(
                    "flex flex-col rounded-sm px-2.5 py-2 text-sm transition-colors duration-fast",
                    "hover:bg-surface focus:bg-surface focus:outline-none",
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

          {/* Hinweis */}
          {!kiAntwort && !kiPending && treffer.length > 0 && (
            <p className="mt-1 border-t px-2.5 pb-1 pt-2 text-2xs text-muted-foreground">
              <span className="font-medium text-foreground-secondary">Enter</span> für eine KI-Antwort
            </p>
          )}
        </div>
      )}
    </div>
  );
}
