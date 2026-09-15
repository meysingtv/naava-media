"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn, formatUhrzeit } from "@/lib/utils";
import { FAHRSTUNDE_FARBE, FAHRSTUNDE_TYPEN } from "@/lib/constants";
import type { Fahrstunde, FahrstundeMitRelationen } from "@/lib/types";
import { FahrstundePanel, type FahrstundeInitial, type Option } from "./fahrstunde-panel";

type Modus = "tag" | "drei" | "woche";

const SPALTEN: Record<Modus, number> = { tag: 1, drei: 3, woche: 7 };

// Termin-Farben je Fahrstunden-Art – zentral in lib/constants.ts.
const TERMIN_FARBE = FAHRSTUNDE_FARBE;

const selectKlasse =
  "h-8 rounded-md border border-border-strong bg-background px-2 text-[13px] text-foreground shadow-xs transition-[border-color,box-shadow] duration-fast hover:border-[hsl(205_18%_74%)] focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20";
const navBtn =
  "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors duration-fast hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25";

const TAG_START = 7; // 07:00
const TAG_ENDE = 21; // 21:00
const PX_PRO_MIN = 1;
const SNAP = 15; // Minuten-Raster beim Ziehen
const GRID_HOEHE = (TAG_ENDE - TAG_START) * 60 * PX_PRO_MIN;
const STUNDEN_LABEL = Array.from({ length: TAG_ENDE - TAG_START + 1 }, (_, i) => TAG_START + i);
const STUNDEN_ZELLE = Array.from({ length: TAG_ENDE - TAG_START }, (_, i) => TAG_START + i);
const WOCHENTAGE_KURZ = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
function iso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function fromIso(s: string): Date {
  return new Date(`${s}T00:00:00`);
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function montagOf(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const diff = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - diff);
  return x;
}
function minuten(uhrzeit: string): number {
  const [h, m] = uhrzeit.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}
function minToUhr(min: number): string {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}
function dauerVon(s: FahrstundeMitRelationen): number {
  return s.dauer_minuten ?? 45;
}

interface Auswahl {
  datum: string;
  a: number; // Start-Minute (gedrückt)
  b: number; // aktuelle Minute (gezogen)
}

/**
 * Weist überlappenden Terminen Spuren (Spalten) zu, damit sie nebeneinander
 * statt übereinander liegen – pro Tag.
 */
function vergebeSpuren(
  events: FahrstundeMitRelationen[],
): Map<string, { spur: number; spuren: number }> {
  const sortiert = [...events].sort(
    (a, b) => minuten(a.uhrzeit) - minuten(b.uhrzeit) || dauerVon(a) - dauerVon(b),
  );
  const ergebnis = new Map<string, { spur: number; spuren: number }>();

  let cluster: FahrstundeMitRelationen[] = [];
  let spaltenEnde: number[] = [];
  const spurVon = new Map<string, number>();
  let clusterMaxEnde = -1;

  const abschliessen = () => {
    const spuren = spaltenEnde.length || 1;
    for (const ev of cluster) {
      ergebnis.set(ev.id, { spur: spurVon.get(ev.id) ?? 0, spuren });
    }
    cluster = [];
    spaltenEnde = [];
    spurVon.clear();
    clusterMaxEnde = -1;
  };

  for (const ev of sortiert) {
    const start = minuten(ev.uhrzeit);
    const ende = start + dauerVon(ev);
    if (cluster.length && start >= clusterMaxEnde) abschliessen();

    let platziert = false;
    for (let c = 0; c < spaltenEnde.length; c++) {
      if (start >= spaltenEnde[c]) {
        spaltenEnde[c] = ende;
        spurVon.set(ev.id, c);
        platziert = true;
        break;
      }
    }
    if (!platziert) {
      spurVon.set(ev.id, spaltenEnde.length);
      spaltenEnde.push(ende);
    }
    cluster.push(ev);
    clusterMaxEnde = Math.max(clusterMaxEnde, ende);
  }
  if (cluster.length) abschliessen();

  return ergebnis;
}

export function Terminplaner({
  heute,
  stunden,
  options,
}: {
  heute: string;
  stunden: FahrstundeMitRelationen[];
  options: { schueler: Option[]; fahrlehrer: Option[]; fahrzeuge: Option[] };
}) {
  const [modus, setModus] = useState<Modus>("woche");
  const [anker, setAnker] = useState<string>(heute);
  const [filterLehrer, setFilterLehrer] = useState("");
  const [filterFahrzeug, setFilterFahrzeug] = useState("");

  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);
  const [bearbeiten, setBearbeiten] = useState<Fahrstunde | undefined>();
  const [initial, setInitial] = useState<FahrstundeInitial | undefined>();

  const [auswahl, setAuswahl] = useState<Auswahl | null>(null);
  const auswahlRef = useRef<Auswahl | null>(null);
  auswahlRef.current = auswahl;
  const ziehtRef = useRef(false);

  const jetzt = new Date();
  const jetztMin = jetzt.getHours() * 60 + jetzt.getMinutes();

  const tage = useMemo(() => {
    const anzahl = SPALTEN[modus];
    const start = modus === "woche" ? montagOf(fromIso(anker)) : fromIso(anker);
    return Array.from({ length: anzahl }, (_, i) => addDays(start, i));
  }, [modus, anker]);

  const sichtbar = useMemo(
    () =>
      stunden.filter(
        (s) =>
          (!filterLehrer || (s.fahrlehrer_id ?? "") === filterLehrer) &&
          (!filterFahrzeug || (s.fahrzeug_id ?? "") === filterFahrzeug),
      ),
    [stunden, filterLehrer, filterFahrzeug],
  );

  const eventsProTag = useMemo(() => {
    const map: Record<string, FahrstundeMitRelationen[]> = {};
    for (const s of sichtbar) (map[s.datum] ??= []).push(s);
    return map;
  }, [sichtbar]);

  function oeffneDialog(init: FahrstundeInitial) {
    setBearbeiten(undefined);
    setInitial(init);
    setKey((k) => k + 1);
    setOpen(true);
  }

  // Drag-Auswahl im Raster -> Dialog mit Startzeit und (grober) Dauer.
  useEffect(() => {
    function onUp() {
      if (!ziehtRef.current) return;
      ziehtRef.current = false;
      const sel = auswahlRef.current;
      setAuswahl(null);
      if (!sel) return;
      const von = Math.min(sel.a, sel.b);
      const bis = Math.max(sel.a, sel.b);
      const dauer = bis - von;
      oeffneDialog({
        datum: sel.datum,
        uhrzeit: minToUhr(von),
        dauer_minuten: dauer >= SNAP ? dauer : 45,
      });
    }
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, []);

  function minuteAusEvent(e: React.MouseEvent): number {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const roh = TAG_START * 60 + y / PX_PRO_MIN;
    const gerundet = Math.round(roh / SNAP) * SNAP;
    return Math.min(Math.max(gerundet, TAG_START * 60), TAG_ENDE * 60);
  }
  function startZiehen(datum: string, e: React.MouseEvent) {
    e.preventDefault();
    const m = minuteAusEvent(e);
    ziehtRef.current = true;
    setAuswahl({ datum, a: m, b: m });
  }
  function beimZiehen(datum: string, e: React.MouseEvent) {
    if (!ziehtRef.current) return;
    const m = minuteAusEvent(e);
    setAuswahl((sel) => (sel && sel.datum === datum ? { ...sel, b: m } : sel));
  }

  function stundeBearbeiten(s: FahrstundeMitRelationen) {
    setInitial(undefined);
    setBearbeiten(s);
    setKey((k) => k + 1);
    setOpen(true);
  }

  function blättern(richtung: number) {
    setAnker(iso(addDays(fromIso(anker), richtung * SPALTEN[modus])));
  }

  const label =
    modus === "tag"
      ? fromIso(anker).toLocaleDateString("de-DE", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : `${tage[0].toLocaleDateString("de-DE", { day: "2-digit", month: "short" })} – ${tage[
          tage.length - 1
        ].toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}`;

  return (
    <div className="space-y-4">
      {/* Steuerung */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border bg-background p-0.5 shadow-xs">
            <button type="button" onClick={() => blättern(-1)} aria-label="Zurück" className={cn(navBtn, "h-7 w-7")}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => blättern(1)} aria-label="Weiter" className={cn(navBtn, "h-7 w-7")}>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm font-semibold capitalize text-foreground">{label}</p>
          {anker !== heute && (
            <Button variant="ghost" size="sm" onClick={() => setAnker(heute)} className="h-7 px-2 text-xs">
              Heute
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border bg-card p-0.5 text-xs">
            {(
              [
                ["tag", "Tag"],
                ["drei", "3 Tage"],
                ["woche", "Woche"],
              ] as [Modus, string][]
            ).map(([v, l]) => (
              <button
                key={v}
                type="button"
                onClick={() => setModus(v)}
                className={cn(
                  "h-7 rounded-[6px] px-2.5 font-medium transition-[background-color,color,box-shadow] duration-fast",
                  modus === v
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {l}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => oeffneDialog({ datum: anker })}>
            <Plus /> <span className="hidden sm:inline">Neuer Termin</span>
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Filter:</span>
        <select
          value={filterLehrer}
          onChange={(e) => setFilterLehrer(e.target.value)}
          className={selectKlasse}
        >
          <option value="">Alle Mitarbeiter</option>
          {options.fahrlehrer.map((f) => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
        <select
          value={filterFahrzeug}
          onChange={(e) => setFilterFahrzeug(e.target.value)}
          className={selectKlasse}
        >
          <option value="">Alle Fahrzeuge</option>
          {options.fahrzeuge.map((f) => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
        {(filterLehrer || filterFahrzeug) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => {
              setFilterLehrer("");
              setFilterFahrzeug("");
            }}
          >
            Zurücksetzen
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Tipp: Im Raster mit gedrückter Maus ziehen, um Beginn und Dauer festzulegen – im Panel
        rechts passt du danach alles an. Einen Termin antippen zum Bearbeiten.
      </p>

      {/* Zeitraster + Termin-Panel */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 overflow-x-auto rounded-xl border bg-card lg:flex-1">
        <div className="flex">
          {/* Zeit-Spalte */}
          <div className="w-14 shrink-0 border-r">
            <div className="h-14 border-b" />
            <div className="relative" style={{ height: GRID_HOEHE }}>
              {STUNDEN_LABEL.map((h) => (
                <div
                  key={h}
                  className="absolute right-2 -translate-y-1/2 text-[11px] font-medium text-muted-foreground"
                  style={{ top: (h - TAG_START) * 60 * PX_PRO_MIN }}
                >
                  {pad(h)}:00
                </div>
              ))}
            </div>
          </div>

          {/* Tages-Spalten */}
          {tage.map((tag) => {
            const tagIso = iso(tag);
            const istHeute = tagIso === heute;
            const tagesEvents = eventsProTag[tagIso] ?? [];
            const spuren = vergebeSpuren(tagesEvents);
            const wochentag = WOCHENTAGE_KURZ[(tag.getDay() + 6) % 7];
            const sel = auswahl && auswahl.datum === tagIso ? auswahl : null;

            return (
              <div key={tagIso} className="flex min-w-[120px] flex-1 flex-col border-r last:border-r-0">
                {/* Tages-Kopf */}
                <div className={cn("flex h-14 flex-col items-center justify-center gap-0.5 border-b", istHeute && "bg-primary-soft/40")}>
                  <span className="text-2xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    {wochentag}
                  </span>
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
                      istHeute ? "bg-primary-soft text-primary" : "text-foreground",
                    )}
                  >
                    {tag.getDate()}
                  </span>
                </div>

                {/* Tages-Raster (Ziehen zum Anlegen) */}
                <div
                  className="relative select-none"
                  style={{ height: GRID_HOEHE }}
                  onMouseDown={(e) => startZiehen(tagIso, e)}
                  onMouseMove={(e) => beimZiehen(tagIso, e)}
                >
                  {/* Stunden-Linien */}
                  {STUNDEN_ZELLE.map((h) => (
                    <div
                      key={h}
                      className="pointer-events-none absolute left-0 right-0 border-b border-dashed border-border/50"
                      style={{ top: (h - TAG_START) * 60 * PX_PRO_MIN, height: 60 * PX_PRO_MIN }}
                    />
                  ))}

                  {/* Aktuelle Auswahl */}
                  {sel &&
                    (() => {
                      const von = Math.min(sel.a, sel.b);
                      const bis = Math.max(sel.a, sel.b);
                      return (
                        <div
                          className="pointer-events-none absolute left-0.5 right-0.5 z-10 rounded-md border border-primary/50 bg-primary/15"
                          style={{
                            top: (von - TAG_START * 60) * PX_PRO_MIN,
                            height: Math.max((bis - von) * PX_PRO_MIN, 2),
                          }}
                        >
                          <span className="absolute left-1 top-0.5 text-[10px] font-semibold text-foreground/70">
                            {minToUhr(von)}
                            {bis > von ? `–${minToUhr(bis)}` : ""}
                          </span>
                        </div>
                      );
                    })()}

                  {/* Termine */}
                  {tagesEvents.map((s) => {
                    const start = Math.max(minuten(s.uhrzeit), TAG_START * 60);
                    const top = (start - TAG_START * 60) * PX_PRO_MIN;
                    const hoehe = Math.max(dauerVon(s) * PX_PRO_MIN, 20);
                    const { spur, spuren: anzahl } = spuren.get(s.id) ?? { spur: 0, spuren: 1 };
                    const ausgefallen = s.status === "ausgefallen";
                    const name = s.fahrschueler
                      ? `${s.fahrschueler.vorname} ${s.fahrschueler.nachname}`
                      : s.notiz?.trim() || FAHRSTUNDE_TYPEN[s.typ].kurz;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={() => stundeBearbeiten(s)}
                        className={cn(
                          "absolute z-20 overflow-hidden rounded-[4px] border bg-card px-1.5 py-1 text-left text-[11px] leading-tight text-foreground transition-[box-shadow,border-color] duration-fast hover:z-30 hover:border-border-strong hover:shadow-md",
                          ausgefallen && "line-through opacity-60",
                        )}
                        style={{
                          top,
                          height: hoehe,
                          left: `calc(${(spur / anzahl) * 100}% + 2px)`,
                          width: `calc(${(1 / anzahl) * 100}% - 4px)`,
                          borderLeft: `3px solid ${ausgefallen ? "#CBD3D7" : TERMIN_FARBE[s.typ]}`,
                        }}
                      >
                        <span className="font-semibold tabular-nums">{formatUhrzeit(s.uhrzeit)}</span>{" "}
                        <span className="text-foreground-secondary">{name}</span>
                      </button>
                    );
                  })}

                  {/* Jetzt-Linie */}
                  {istHeute && jetztMin >= TAG_START * 60 && jetztMin <= TAG_ENDE * 60 && (
                    <div
                      className="pointer-events-none absolute left-0 right-0 z-30"
                      style={{ top: (jetztMin - TAG_START * 60) * PX_PRO_MIN }}
                    >
                      <div className="h-0 border-t-2 border-primary" />
                      <div className="absolute -left-1 -top-[5px] h-2 w-2 rounded-full bg-primary" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        </div>
        {open && (
          <div className="animate-slide-up-in lg:sticky lg:top-[4.5rem] lg:w-[380px] lg:shrink-0">
            <FahrstundePanel
              key={key}
              options={options}
              fahrstunde={bearbeiten}
              initial={initial}
              onClose={() => setOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
