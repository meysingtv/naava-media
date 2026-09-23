"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  CalendarPlus,
  Car,
  Contact,
  CornerDownLeft,
  FilePlus2,
  FileText,
  ListPlus,
  Loader2,
  Search,
  Sparkles,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

import { bereicheFuer } from "@/components/shared/bereiche";
import { AKZENT } from "@/lib/farben";
import { cn } from "@/lib/utils";
import { globalSuche, kiSuche, type SuchTreffer } from "@/app/(dashboard)/such-actions";
import type { FahrlehrerRolle } from "@/lib/types";

// ---------------------------------------------------------------------------
// Gruppenbezeichnungen und Icons je Treffertyp
// ---------------------------------------------------------------------------
const GRUPPENBEZEICHNUNG: Record<SuchTreffer["typ"], string> = {
  schueler: "Schüler",
  benutzer: "Benutzer",
  fahrzeug: "Fahrzeuge",
  rechnung: "Rechnungen",
};

const TYP_ICON: Record<SuchTreffer["typ"], LucideIcon> = {
  schueler: Users,
  benutzer: Contact,
  fahrzeug: Car,
  rechnung: FileText,
};

/** Farbe der Symbol-Kachel je Treffertyp. */
const TYP_FARBE: Record<SuchTreffer["typ"], string> = {
  schueler: AKZENT.blau,
  benutzer: AKZENT.violett,
  fahrzeug: AKZENT.nacht,
  rechnung: AKZENT.orange,
};

const REIHENFOLGE: SuchTreffer["typ"][] = ["schueler", "benutzer", "fahrzeug", "rechnung"];

/** Die vier „+ Neu"-Einträge – identisch zum Sidebar-Menü. */
const AKTIONEN: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/schueler/neu", label: "Schüler anlegen", icon: UserPlus },
  { href: "/kalender", label: "Termin planen", icon: CalendarPlus },
  { href: "/rechnungen/neu", label: "Rechnung erstellen", icon: FilePlus2 },
  { href: "/aufgaben", label: "Aufgabe erfassen", icon: ListPlus },
];

interface Eintrag {
  id: string;
  gruppe: string;
  label: string;
  untertitel?: string;
  href: string;
  icon: LucideIcon;
  /** Farbe der Symbol-Kachel; ohne = neutral grau. */
  farbe?: string;
  /** Kurze Angabe rechts statt zweiter Zeile (z. B. der Bereich). */
  rechts?: boolean;
  /** Eintrag „Assistenten fragen" – öffnet keine Seite. */
  ki?: boolean;
}

/** Taste in der Hilfezeile unten. */
function Taste({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-card px-1 font-sans text-[11px] font-medium text-foreground-secondary shadow-xs">
      {children}
    </kbd>
  );
}

function gruppiere(eintraege: Eintrag[]): { gruppe: string; eintraege: Eintrag[] }[] {
  const map = new Map<string, Eintrag[]>();
  for (const e of eintraege) {
    const liste = map.get(e.gruppe) ?? [];
    liste.push(e);
    map.set(e.gruppe, liste);
  }
  return Array.from(map.entries()).map(([gruppe, liste]) => ({ gruppe, eintraege: liste }));
}

// ---------------------------------------------------------------------------
// Komponente
// ---------------------------------------------------------------------------

/**
 * Kommandopalette (⌘K) auf Radix Dialog – kein `cmdk`. Die Such- und
 * KI-Logik (Debounce 250 ms, `globalSuche`, `kiSuche`, Stale-Schutz über
 * `letzteQueryRef`) ist unverändert aus `global-search.tsx` übernommen.
 *
 * Reihenfolge: Aktionen → Springen zu → Treffer → KI-Antwort als Block oben.
 * `Enter` öffnet den markierten Eintrag, `⌘Enter` fragt die KI; ohne
 * Markierung fragt `Enter` ebenfalls die KI (das heutige Verhalten).
 */
export function CommandPalette({
  open,
  onOpenChange,
  rolle,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  rolle: FahrlehrerRolle;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [treffer, setTreffer] = useState<SuchTreffer[]>([]);
  const [kiAntwort, setKiAntwort] = useState<string | undefined>(undefined);
  const [hatGesucht, setHatGesucht] = useState(false);
  const [markiert, setMarkiert] = useState(0);

  const [suchPending, startSuche] = useTransition();
  const [kiPending, startKi] = useTransition();

  const inputRef = useRef<HTMLInputElement>(null);
  const listeRef = useRef<HTMLDivElement>(null);
  // Stale-result-Schutz: letzte abgeschickte Query merken
  const letzteQueryRef = useRef<string>("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Statische Einträge: Aktionen + alle sichtbaren Navigationsziele
  const statisch = useMemo<Eintrag[]>(() => {
    const erlaubt = new Set(bereicheFuer(rolle).flatMap((b) => b.items.map((i) => i.href)));
    const aktionen = AKTIONEN.filter(
      (a) => erlaubt.has(a.href) || erlaubt.has(a.href.replace(/\/neu$/, "")),
    ).map((a) => ({
      id: `aktion:${a.href}`,
      gruppe: "Aktionen",
      label: a.label,
      href: a.href,
      icon: a.icon,
      farbe: AKZENT.blau,
    }));

    const ziele = bereicheFuer(rolle).flatMap((b) =>
      b.items.map((i) => ({
        id: `ziel:${i.href}`,
        gruppe: "Springen zu",
        label: i.label,
        untertitel: b.label !== i.label ? b.label : undefined,
        href: i.href,
        icon: i.icon,
        rechts: true,
      })),
    );
    return [...aktionen, ...ziele];
  }, [rolle]);

  // Einfache includes-Suche auf dem Label
  const gefiltertStatisch = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return statisch.filter((e) => e.gruppe === "Aktionen").concat(statisch.filter((e) => e.gruppe === "Springen zu"));
    return statisch.filter((e) => e.label.toLowerCase().includes(q));
  }, [statisch, query]);

  const trefferEintraege = useMemo<Eintrag[]>(
    () =>
      REIHENFOLGE.flatMap((typ) =>
        treffer
          .filter((t) => t.typ === typ)
          .map((t) => ({
            id: t.id,
            gruppe: GRUPPENBEZEICHNUNG[typ],
            label: t.titel,
            untertitel: t.untertitel ?? undefined,
            href: t.href,
            icon: TYP_ICON[typ],
            farbe: TYP_FARBE[typ],
          })),
      ),
    [treffer],
  );

  // Ab zwei Zeichen steht am Ende immer „… den Assistenten fragen".
  const frage = query.trim();
  const alle = useMemo<Eintrag[]>(() => {
    const liste = [...gefiltertStatisch, ...trefferEintraege];
    if (frage.length >= 2) {
      liste.push({
        id: "ki",
        gruppe: "Assistent",
        label: `„${frage}“ fragen`,
        untertitel: "Antwort aus deinen Daten",
        href: "",
        icon: Sparkles,
        farbe: AKZENT.violett,
        ki: true,
      });
    }
    return liste;
  }, [gefiltertStatisch, trefferEintraege, frage]);
  const ohneTreffer = hatGesucht && frage.length >= 2 && gefiltertStatisch.length === 0 && trefferEintraege.length === 0;
  const gruppen = useMemo(() => gruppiere(alle), [alle]);

  // Markierung zurücksetzen, sobald sich die Liste ändert
  useEffect(() => setMarkiert(0), [query, treffer.length]);

  // Zustand beim Schließen leeren
  useEffect(() => {
    if (open) return;
    setQuery("");
    setTreffer([]);
    setKiAntwort(undefined);
    setHatGesucht(false);
  }, [open]);

  // Markierten Eintrag im Blick behalten
  useEffect(() => {
    listeRef.current?.querySelector("[data-markiert=true]")?.scrollIntoView({ block: "nearest" });
  }, [markiert]);

  // -------------------------------------------------------------------------
  // Debounced Suche (250 ms) – unverändert übernommen
  // -------------------------------------------------------------------------
  const fuehreSucheAus = useCallback(
    (wert: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (wert.trim().length < 2) {
        setTreffer([]);
        setHatGesucht(false);
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
          setKiAntwort(undefined);
        });
      }, 250);
    },
    [startSuche],
  );

  function frageKi() {
    const aktuelleQuery = query;
    if (aktuelleQuery.trim().length < 2) return;
    letzteQueryRef.current = aktuelleQuery;
    startKi(async () => {
      const ergebnis = await kiSuche(aktuelleQuery);
      if (letzteQueryRef.current !== aktuelleQuery) return;
      setTreffer(ergebnis.treffer);
      setHatGesucht(true);
      setKiAntwort(ergebnis.kiAntwort);
    });
  }

  function oeffne(eintrag: Eintrag) {
    if (eintrag.ki) {
      frageKi();
      return;
    }
    onOpenChange(false);
    router.push(eintrag.href);
  }

  function beiTaste(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMarkiert((m) => Math.min(m + 1, Math.max(0, alle.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setMarkiert((m) => Math.max(0, m - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if ((e.metaKey || e.ctrlKey) || alle.length === 0) frageKi();
      else oeffne(alle[markiert]);
    }
  }

  const istLadend = suchPending || kiPending;
  let laufenderIndex = -1;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-palette bg-foreground/30 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
          className={cn(
            "fixed left-1/2 top-[12vh] z-palette w-[680px] max-w-[calc(100%-2rem)] -translate-x-1/2",
            "overflow-hidden rounded-xl border border-border bg-popover p-0 shadow-overlay",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-[0.985] data-[state=open]:zoom-in-[0.985]",
          )}
        >
          <DialogPrimitive.Title className="sr-only">Suchen und springen</DialogPrimitive.Title>

          {/* Eingabe */}
          <div className="flex h-14 items-center gap-3 border-b border-border px-4">
            {istLadend ? (
              <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
            ) : (
              <Search className="h-5 w-5 shrink-0 text-foreground-tertiary" strokeWidth={2} />
            )}
            <input
              ref={inputRef}
              role="combobox"
              aria-expanded
              aria-controls="palette-liste"
              aria-activedescendant={alle[markiert] ? `palette-${alle[markiert].id}` : undefined}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                fuehreSucheAus(e.target.value);
              }}
              onKeyDown={beiTaste}
              placeholder="Suchen, springen oder den Assistenten fragen …"
              className="h-full w-full bg-transparent text-[15px] text-foreground outline-none placeholder:text-foreground-tertiary"
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button
                type="button"
                aria-label="Eingabe leeren"
                onClick={() => {
                  setQuery("");
                  fuehreSucheAus("");
                  inputRef.current?.focus();
                }}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-foreground-tertiary transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            )}
            <DialogPrimitive.Close className="shrink-0 rounded-md border border-border px-1.5 py-0.5 text-[11px] font-medium text-foreground-tertiary transition-colors hover:bg-muted hover:text-foreground">
              Esc
            </DialogPrimitive.Close>
          </div>

          {/* Antwort des Assistenten */}
          {(kiAntwort || kiPending) && (
            <div
              className="mx-3 mt-3 rounded-lg border px-3.5 py-3"
              style={{ borderColor: `${AKZENT.violett}33`, background: `${AKZENT.violett}0D` }}
            >
              <p className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: AKZENT.violett }}>
                {kiPending && !kiAntwort ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
                )}
                Assistent
              </p>
              <p className="mt-1.5 text-13 leading-5 text-foreground">
                {kiPending && !kiAntwort ? "Schaut in deine Daten …" : kiAntwort}
              </p>
            </div>
          )}

          {/* Liste */}
          <div
            ref={listeRef}
            id="palette-liste"
            role="listbox"
            className="max-h-[min(60vh,480px)] overflow-y-auto px-2 pb-2 scrollbar-thin"
          >
            {ohneTreffer && !istLadend && (
              <p className="px-2.5 pb-1 pt-4 text-13 text-foreground-secondary">
                Keine Treffer für „{frage}“ – frag stattdessen den Assistenten.
              </p>
            )}

            {gruppen.map(({ gruppe, eintraege }) => (
              <div key={gruppe}>
                <p className="px-2.5 pb-1.5 pt-3.5 text-xs font-medium text-foreground-tertiary">{gruppe}</p>
                {eintraege.map((e) => {
                  laufenderIndex += 1;
                  const istMarkiert = laufenderIndex === markiert;
                  const Icon = e.icon;
                  const zweiZeilen = Boolean(e.untertitel) && !e.rechts;
                  return (
                    <button
                      key={e.id}
                      id={`palette-${e.id}`}
                      role="option"
                      type="button"
                      aria-selected={istMarkiert}
                      data-markiert={istMarkiert}
                      onMouseEnter={() => setMarkiert(alle.findIndex((a) => a.id === e.id))}
                      onClick={() => oeffne(e)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-2.5 text-left transition-colors duration-fast",
                        zweiZeilen ? "h-12" : "h-10",
                        istMarkiert && "bg-muted",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-foreground-secondary"
                        style={e.farbe ? { background: `${e.farbe}14`, color: e.farbe } : undefined}
                      >
                        <Icon className="h-4 w-4" strokeWidth={1.9} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">{e.label}</span>
                        {zweiZeilen && (
                          <span className="block truncate text-xs text-foreground-tertiary">{e.untertitel}</span>
                        )}
                      </span>
                      {e.rechts && e.untertitel && (
                        <span className="shrink-0 text-xs text-foreground-tertiary">{e.untertitel}</span>
                      )}
                      <CornerDownLeft
                        className={cn("h-3.5 w-3.5 shrink-0 text-foreground-tertiary", !istMarkiert && "invisible")}
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Fuß */}
          <div className="flex h-10 items-center justify-between gap-4 border-t border-border bg-surface-muted/70 px-4 text-xs text-foreground-tertiary">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <Taste>↑</Taste>
                <Taste>↓</Taste>
                Auswählen
              </span>
              <span className="flex items-center gap-1.5">
                <Taste>↵</Taste>
                Öffnen
              </span>
            </div>
            <span className="hidden items-center gap-1.5 sm:flex">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2} style={{ color: AKZENT.violett }} aria-hidden="true" />
              Fragen in ganzen Sätzen gehen auch
            </span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
