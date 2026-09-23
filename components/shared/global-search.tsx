"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Car, Contact, FileText, Loader2, Search, Users, X, type LucideIcon } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { bereicheFuer } from "@/components/shared/bereiche";
import { useSidebar } from "@/components/shared/sidebar-context";
import { cn } from "@/lib/utils";
import { globalSuche, type SuchTreffer } from "@/app/(dashboard)/such-actions";

const TYP: Record<SuchTreffer["typ"], { gruppe: string; icon: LucideIcon }> = {
  schueler: { gruppe: "Schüler", icon: Users },
  rechnung: { gruppe: "Rechnungen", icon: FileText },
  benutzer: { gruppe: "Team", icon: Contact },
  fahrzeug: { gruppe: "Fahrzeuge", icon: Car },
};
const REIHENFOLGE: SuchTreffer["typ"][] = ["schueler", "rechnung", "benutzer", "fahrzeug"];

interface Eintrag {
  id: string;
  gruppe: string;
  label: string;
  untertitel?: string;
  href: string;
  icon: LucideIcon;
}

/**
 * Such-Logik für Feld und Mobil-Suche: Seiten sofort, Daten ab zwei Zeichen
 * (250 ms verzögert, veraltete Antworten werden verworfen).
 */
function useSuche() {
  const { rolle } = useSidebar();
  const [query, setQuery] = React.useState("");
  const [treffer, setTreffer] = React.useState<SuchTreffer[]>([]);
  const [gesucht, setGesucht] = React.useState("");
  const [laedt, startSuche] = React.useTransition();
  const letzte = React.useRef("");
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const seiten = React.useMemo(
    () => bereicheFuer(rolle).flatMap((b) => b.items.map((i) => ({ ...i, bereich: b.label }))),
    [rolle],
  );

  const aendern = React.useCallback((wert: string) => {
    setQuery(wert);
    if (timer.current) clearTimeout(timer.current);
    const q = wert.trim();
    if (q.length < 2) {
      letzte.current = "";
      setTreffer([]);
      setGesucht("");
      return;
    }
    timer.current = setTimeout(() => {
      letzte.current = q;
      startSuche(async () => {
        const ergebnis = await globalSuche(q);
        if (letzte.current !== q) return;
        setTreffer(ergebnis);
        setGesucht(q);
      });
    }, 250);
  }, []);

  React.useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const q = query.trim().toLowerCase();
  const eintraege = React.useMemo<Eintrag[]>(() => {
    if (!q) return [];
    const seitenTreffer = seiten
      .filter((s) => {
        const label = s.label.toLowerCase();
        return label.split(/[\s-]+/).some((w) => w.startsWith(q)) || (q.length >= 3 && label.includes(q));
      })
      .slice(0, 4)
      .map((s) => ({
        id: `seite:${s.href}`,
        gruppe: "Seiten",
        label: s.label,
        untertitel: s.bereich !== s.label ? s.bereich : undefined,
        href: s.href,
        icon: s.icon,
      }));
    const daten = REIHENFOLGE.flatMap((typ) =>
      treffer
        .filter((t) => t.typ === typ)
        .map((t) => ({
          id: `${t.typ}:${t.id}`,
          gruppe: TYP[typ].gruppe,
          label: t.titel,
          untertitel: t.untertitel ?? undefined,
          href: t.href,
          icon: TYP[typ].icon,
        })),
    );
    return [...seitenTreffer, ...daten];
  }, [q, seiten, treffer]);

  // Suche für die aktuelle Eingabe abgeschlossen → „Keine Treffer" darf erscheinen.
  const fertig = q.length >= 2 && gesucht === query.trim() && !laedt;

  return { query, aendern, eintraege, laedt, fertig };
}

/** Pfeiltasten, Enter und Esc – gemeinsam für Feld und Mobil-Suche. */
function useTastatur(eintraege: Eintrag[], oeffne: (e: Eintrag) => void, beiEsc: () => void) {
  const [markiert, setMarkiert] = React.useState(0);
  React.useEffect(() => setMarkiert(0), [eintraege]);

  function beiTaste(ev: React.KeyboardEvent<HTMLInputElement>) {
    if (ev.key === "ArrowDown") {
      ev.preventDefault();
      setMarkiert((m) => Math.min(m + 1, eintraege.length - 1));
    } else if (ev.key === "ArrowUp") {
      ev.preventDefault();
      setMarkiert((m) => Math.max(0, m - 1));
    } else if (ev.key === "Enter") {
      const e = eintraege[markiert];
      if (e) {
        ev.preventDefault();
        oeffne(e);
      }
    } else if (ev.key === "Escape") {
      ev.preventDefault();
      beiEsc();
    }
  }

  return { markiert, setMarkiert, beiTaste };
}

/** Schlanke Trefferliste: Gruppenname, Zeilen mit Symbol, Name und Zusatz. */
function Ergebnisse({
  listeId,
  eintraege,
  markiert,
  setMarkiert,
  oeffne,
  query,
  laedt,
  fertig,
  className,
}: {
  listeId: string;
  eintraege: Eintrag[];
  markiert: number;
  setMarkiert: (i: number) => void;
  oeffne: (e: Eintrag) => void;
  query: string;
  laedt: boolean;
  fertig: boolean;
  className?: string;
}) {
  const gruppen: { gruppe: string; eintraege: { e: Eintrag; i: number }[] }[] = [];
  eintraege.forEach((e, i) => {
    const letzte = gruppen[gruppen.length - 1];
    if (letzte && letzte.gruppe === e.gruppe) letzte.eintraege.push({ e, i });
    else gruppen.push({ gruppe: e.gruppe, eintraege: [{ e, i }] });
  });

  return (
    <div id={listeId} role="listbox" aria-label="Suchergebnisse" className={className}>
      {gruppen.map(({ gruppe, eintraege: zeilen }) => (
        <div key={gruppe} role="group" aria-label={gruppe}>
          <p className="px-2 pb-1 pt-2 text-[11px] font-medium text-foreground-tertiary">{gruppe}</p>
          {zeilen.map(({ e, i }) => {
            const Icon = e.icon;
            const an = i === markiert;
            return (
              <button
                key={e.id}
                id={`${listeId}-${i}`}
                type="button"
                role="option"
                aria-selected={an}
                tabIndex={-1}
                onMouseDown={(ev) => ev.preventDefault()}
                onMouseMove={() => setMarkiert(i)}
                onClick={() => oeffne(e)}
                className={cn(
                  "flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-left text-13 transition-colors duration-fast",
                  an && "bg-muted",
                )}
              >
                <Icon className="h-4 w-4 shrink-0 text-foreground-tertiary" strokeWidth={1.75} aria-hidden="true" />
                <span className="truncate font-medium text-foreground">{e.label}</span>
                {e.untertitel && <span className="min-w-0 truncate text-foreground-tertiary">{e.untertitel}</span>}
              </button>
            );
          })}
        </div>
      ))}

      {eintraege.length === 0 &&
        (laedt ? (
          <p className="flex items-center gap-2 px-2 py-2.5 text-13 text-foreground-tertiary">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Suche läuft …
          </p>
        ) : fertig ? (
          <p className="px-2 py-2.5 text-13 text-foreground-secondary">Keine Treffer für „{query.trim()}“</p>
        ) : null)}
    </div>
  );
}

/**
 * Suche in der App-Leiste: ein echtes Eingabefeld. Beim Tippen klappt direkt
 * darunter eine kleine Trefferliste auf – Seiten sofort, Schüler, Rechnungen,
 * Team und Fahrzeuge ab zwei Zeichen. Auf schmalen Geräten eine Lupe, die
 * oben ein kompaktes Suchfeld öffnet. ⌘K / Strg+K springt ins Feld.
 */
export function GlobalSearch({ variant = "feld", className }: { variant?: "feld" | "icon"; className?: string }) {
  return variant === "icon" ? <SucheMobil className={className} /> : <SuchFeld className={className} />;
}

function SuchFeld({ className }: { className?: string }) {
  const router = useRouter();
  const { paletteOffen, setPaletteOffen } = useSidebar();
  const s = useSuche();
  const listeId = React.useId();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [fokus, setFokus] = React.useState(false);

  function oeffne(e: Eintrag) {
    router.push(e.href);
    s.aendern("");
    inputRef.current?.blur();
  }
  const t = useTastatur(s.eintraege, oeffne, () => (s.query ? s.aendern("") : inputRef.current?.blur()));

  // ⌘K / Strg+K: ins Feld springen (nur, wenn das Feld sichtbar ist)
  React.useEffect(() => {
    if (!paletteOffen || !window.matchMedia("(min-width: 768px)").matches) return;
    inputRef.current?.focus();
    inputRef.current?.select();
    setPaletteOffen(false);
  }, [paletteOffen, setPaletteOffen]);

  const offen = fokus && s.query.trim().length > 0 && (s.eintraege.length > 0 || s.laedt || s.fertig);

  return (
    <div className={cn("relative w-full", className)}>
      <div
        className={cn(
          "flex h-9 w-full items-center gap-2.5 rounded-lg border border-border bg-card pl-3 pr-1.5 shadow-xs",
          "transition-[border-color,box-shadow] duration-fast hover:border-border-strong",
          "focus-within:border-primary/60 focus-within:ring-[3px] focus-within:ring-primary/15 focus-within:hover:border-primary/60",
        )}
      >
        {s.laedt ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-foreground-tertiary" aria-hidden="true" />
        ) : (
          <Search className="h-4 w-4 shrink-0 text-foreground-tertiary" strokeWidth={2} aria-hidden="true" />
        )}
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label="Suchen"
          aria-expanded={offen}
          aria-controls={listeId}
          aria-autocomplete="list"
          aria-activedescendant={offen && s.eintraege[t.markiert] ? `${listeId}-${t.markiert}` : undefined}
          value={s.query}
          onChange={(e) => s.aendern(e.target.value)}
          onFocus={() => setFokus(true)}
          onBlur={() => setFokus(false)}
          onKeyDown={t.beiTaste}
          placeholder="Schüler, Rechnungen, Seiten suchen …"
          autoComplete="off"
          spellCheck={false}
          className="h-full min-w-0 flex-1 bg-transparent text-13 text-foreground outline-none placeholder:text-foreground-tertiary"
        />
        {s.query && (
          <button
            type="button"
            aria-label="Eingabe leeren"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => s.aendern("")}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-foreground-tertiary transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          </button>
        )}
      </div>

      {offen && (
        <Ergebnisse
          listeId={listeId}
          eintraege={s.eintraege}
          markiert={t.markiert}
          setMarkiert={t.setMarkiert}
          oeffne={oeffne}
          query={s.query}
          laedt={s.laedt}
          fertig={s.fertig}
          className="absolute left-1/2 top-[calc(100%+6px)] z-popover max-h-[min(420px,70vh)] w-[420px] max-w-[calc(100vw-2rem)] -translate-x-1/2 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 shadow-popover scrollbar-thin animate-fade-in"
        />
      )}
    </div>
  );
}

function SucheMobil({ className }: { className?: string }) {
  const router = useRouter();
  const { paletteOffen, setPaletteOffen } = useSidebar();
  const s = useSuche();
  const listeId = React.useId();
  const [offen, setOffen] = React.useState(false);
  const { aendern } = s;

  const schliessen = React.useCallback(() => {
    setOffen(false);
    aendern("");
  }, [aendern]);

  function oeffne(e: Eintrag) {
    router.push(e.href);
    schliessen();
  }
  const t = useTastatur(s.eintraege, oeffne, schliessen);

  // ⌘K / Strg+K auf schmalen Geräten (z. B. Tablet mit Tastatur)
  React.useEffect(() => {
    if (!paletteOffen || window.matchMedia("(min-width: 768px)").matches) return;
    setOffen(true);
    setPaletteOffen(false);
  }, [paletteOffen, setPaletteOffen]);

  return (
    <>
      <Tooltip side="bottom" sideOffset={8}>
        <TooltipTrigger>
          <button
            type="button"
            onClick={() => setOffen(true)}
            aria-label="Suchen"
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors duration-fast",
              "hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
              className,
            )}
          >
            <Search className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Suchen</TooltipContent>
      </Tooltip>

      {offen &&
        createPortal(
          <div className="fixed inset-0 z-palette">
            <div className="absolute inset-0 bg-foreground/25 animate-fade-in" onClick={schliessen} aria-hidden="true" />
            <div className="absolute inset-x-2 top-2 rounded-xl border border-border bg-popover p-2 shadow-overlay animate-fade-in">
              <div className="flex h-10 items-center gap-2 rounded-lg bg-muted px-3">
                {s.laedt ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-foreground-tertiary" aria-hidden="true" />
                ) : (
                  <Search className="h-4 w-4 shrink-0 text-foreground-tertiary" strokeWidth={2} aria-hidden="true" />
                )}
                <input
                  autoFocus
                  type="text"
                  role="combobox"
                  aria-label="Suchen"
                  aria-expanded={s.query.trim().length > 0}
                  aria-controls={listeId}
                  aria-autocomplete="list"
                  value={s.query}
                  onChange={(e) => s.aendern(e.target.value)}
                  onKeyDown={t.beiTaste}
                  placeholder="Schüler, Rechnungen, Seiten …"
                  autoComplete="off"
                  spellCheck={false}
                  className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-foreground-tertiary"
                />
                <button
                  type="button"
                  onClick={schliessen}
                  className="shrink-0 text-13 font-medium text-primary-text"
                >
                  Abbrechen
                </button>
              </div>
              {s.query.trim() && (
                <Ergebnisse
                  listeId={listeId}
                  eintraege={s.eintraege}
                  markiert={t.markiert}
                  setMarkiert={t.setMarkiert}
                  oeffne={oeffne}
                  query={s.query}
                  laedt={s.laedt}
                  fertig={s.fertig}
                  className="mt-1 max-h-[60vh] overflow-y-auto"
                />
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
