"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DatumFeld } from "@/components/ui/datum-feld";
import { Segmente } from "@/components/shared/filter-bar";
import { cn, formatUhrzeit } from "@/lib/utils";
import { FAHRSTUNDE_FARBE, FAHRSTUNDE_TYPEN } from "@/lib/constants";
import type { Fahrstunde, FahrstundeMitRelationen } from "@/lib/types";
import { FahrstundePanel, type FahrstundeInitial, type Option } from "./fahrstunde-panel";

// ---------------------------------------------------------------------------
// Zeitraster des Betriebstags
// ---------------------------------------------------------------------------
const TAG_START = 7 * 60; // 07:00
const TAG_ENDE = 21 * 60; // 21:00
const SNAP = 15;
const STUNDE_PX = 56;
const PX_MIN = STUNDE_PX / 60;
const HOEHE = ((TAG_ENDE - TAG_START) / 60) * STUNDE_PX;
const STUNDEN = Array.from({ length: (TAG_ENDE - TAG_START) / 60 + 1 }, (_, i) => TAG_START / 60 + i);

type Ansicht = "tag" | "woche";
type Dimension = "lehrer" | "fahrzeug";

interface Pruef {
  id: string;
  datum: string;
  uhrzeit: string | null;
  art: string;
  pruefstelle: string | null;
  schueler: string | null;
}

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = (s: string) => new Date(`${s}T00:00:00`);
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function montagOf(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
function minuten(uhrzeit: string): number {
  const [h, m] = uhrzeit.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}
const minToUhr = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
const dauer = (s: FahrstundeMitRelationen) => s.dauer_minuten ?? 45;
const y = (min: number) => (Math.min(Math.max(min, TAG_START), TAG_ENDE) - TAG_START) * PX_MIN;

/**
 * Überlappende Termine einer Spalte nebeneinander legen: Termine, die sich
 * (auch über Dritte) überschneiden, bilden eine Gruppe und teilen sich die
 * Breite; alle anderen bleiben volle Breite.
 */
function spurenVon(events: FahrstundeMitRelationen[]): Map<string, { spur: number; spuren: number }> {
  const sortiert = [...events].sort((a, b) => minuten(a.uhrzeit) - minuten(b.uhrzeit) || dauer(b) - dauer(a));
  const ergebnis = new Map<string, { spur: number; spuren: number }>();
  let gruppe: { id: string; spur: number }[] = [];
  let enden: number[] = [];
  let gruppenEnde = -1;

  const abschliessen = () => {
    for (const g of gruppe) ergebnis.set(g.id, { spur: g.spur, spuren: Math.max(1, enden.length) });
    gruppe = [];
    enden = [];
  };

  for (const ev of sortiert) {
    const start = minuten(ev.uhrzeit);
    const ende = start + dauer(ev);
    if (start >= gruppenEnde) abschliessen();
    let spur = enden.findIndex((e) => start >= e);
    if (spur === -1) {
      spur = enden.length;
      enden.push(0);
    }
    enden[spur] = ende;
    gruppe.push({ id: ev.id, spur });
    gruppenEnde = Math.max(gruppenEnde, ende);
  }
  abschliessen();
  return ergebnis;
}

const WT_LANG = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

export function Terminplaner({
  heute,
  startDatum,
  stunden,
  options,
  pruefungen = [],
}: {
  heute: string;
  /** Tag, der beim Öffnen gezeigt wird (z. B. aus dem Monatskalender im Dashboard). */
  startDatum?: string;
  stunden: FahrstundeMitRelationen[];
  options: { schueler: Option[]; fahrlehrer: Option[]; fahrzeuge: Option[] };
  pruefungen?: Pruef[];
}) {
  const [ansicht, setAnsicht] = useState<Ansicht>("tag");
  const [dimension, setDimension] = useState<Dimension>("lehrer");
  const [anker, setAnker] = useState(startDatum ?? heute);
  const [nurBelegt, setNurBelegt] = useState(false);

  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);
  const [bearbeiten, setBearbeiten] = useState<Fahrstunde | undefined>();
  const [initial, setInitial] = useState<FahrstundeInitial | undefined>();

  // Jetzt-Linie
  const [nowMin, setNowMin] = useState(() => new Date().getHours() * 60 + new Date().getMinutes());
  useEffect(() => {
    const t = setInterval(() => setNowMin(new Date().getHours() * 60 + new Date().getMinutes()), 60000);
    return () => clearInterval(t);
  }, []);

  function neu(init: FahrstundeInitial) {
    setBearbeiten(undefined);
    setInitial(init);
    setKey((k) => k + 1);
    setOpen(true);
  }
  function editieren(s: FahrstundeMitRelationen) {
    setInitial(undefined);
    setBearbeiten(s);
    setKey((k) => k + 1);
    setOpen(true);
  }

  // ---- Ziehen zum Anlegen (senkrecht, innerhalb einer Spalte) ----
  const [sel, setSel] = useState<{ lane: string; datum: string; a: number; b: number } | null>(null);
  const selRef = useRef(sel);
  selRef.current = sel;
  const zieht = useRef(false);

  useEffect(() => {
    function up() {
      if (!zieht.current) return;
      zieht.current = false;
      const s = selRef.current;
      setSel(null);
      if (!s) return;
      const von = Math.min(s.a, s.b);
      const bis = Math.max(s.a, s.b) + SNAP;
      neu({
        datum: s.datum,
        uhrzeit: minToUhr(von),
        dauer_minuten: s.a === s.b ? 45 : bis - von,
        fahrlehrer_id: dimension === "lehrer" && s.lane !== "none" ? s.lane : undefined,
        fahrzeug_id: dimension === "fahrzeug" && s.lane !== "none" ? s.lane : undefined,
      });
    }
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimension]);

  function minuteAus(e: React.MouseEvent): number {
    const rect = e.currentTarget.getBoundingClientRect();
    const roh = TAG_START + (e.clientY - rect.top) / PX_MIN;
    return Math.min(Math.max(Math.floor(roh / SNAP) * SNAP, TAG_START), TAG_ENDE - SNAP);
  }

  // ---- Tagesdaten ----
  const tagesEvents = useMemo(() => stunden.filter((s) => s.datum === anker), [stunden, anker]);
  const tagesPruef = useMemo(
    () => pruefungen.filter((p) => p.datum === anker).sort((a, b) => (a.uhrzeit ?? "").localeCompare(b.uhrzeit ?? "")),
    [pruefungen, anker],
  );

  const lanes = useMemo(() => {
    const basis = dimension === "lehrer" ? options.fahrlehrer : options.fahrzeuge;
    const proLane: Record<string, FahrstundeMitRelationen[]> = {};
    for (const ev of tagesEvents) {
      const lid = (dimension === "lehrer" ? ev.fahrlehrer_id : ev.fahrzeug_id) ?? "none";
      (proLane[lid] ??= []).push(ev);
    }
    const liste = basis.map((o) => ({ id: o.id, label: o.label, events: proLane[o.id] ?? [] }));
    if (proLane["none"]?.length) liste.push({ id: "none", label: "Ohne Zuordnung", events: proLane["none"] });
    return nurBelegt ? liste.filter((l) => l.events.length > 0) : liste;
  }, [dimension, options, tagesEvents, nurBelegt]);

  const wochentage = useMemo(() => {
    const start = montagOf(fromIso(anker));
    return Array.from({ length: 7 }, (_, i) => iso(addDays(start, i)));
  }, [anker]);

  function blaettern(r: number) {
    setAnker(iso(addDays(fromIso(anker), r * (ansicht === "woche" ? 7 : 1))));
  }

  const ankerDate = fromIso(anker);
  const label =
    ansicht === "tag"
      ? ankerDate.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      : `${fromIso(wochentage[0]).toLocaleDateString("de-DE", { day: "numeric", month: "short" })} – ${fromIso(wochentage[6]).toLocaleDateString(
          "de-DE",
          { day: "numeric", month: "short", year: "numeric" },
        )}`;

  const anzahl =
    ansicht === "tag"
      ? tagesEvents.filter((e) => e.status !== "ausgefallen").length
      : stunden.filter((e) => wochentage.includes(e.datum) && e.status !== "ausgefallen").length;

  return (
    <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
      <div className="min-w-0 flex-1 space-y-3">
        {/* Werkzeugleiste */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex h-8 items-center rounded-lg bg-card p-0.5 shadow-panel">
            <Button variant="ghost" size="icon-xs" onClick={() => blaettern(-1)} aria-label={ansicht === "tag" ? "Vorheriger Tag" : "Vorherige Woche"}>
              <ChevronLeft />
            </Button>
            <Button variant="ghost" size="icon-xs" onClick={() => blaettern(1)} aria-label={ansicht === "tag" ? "Nächster Tag" : "Nächste Woche"}>
              <ChevronRight />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setAnker(heute)} disabled={anker === heute}>
            Heute
          </Button>
          <h2 className="ml-1 text-[15px] font-semibold text-foreground">{label}</h2>
          <span className="text-13 text-foreground-secondary">
            {anzahl} {anzahl === 1 ? "Termin" : "Termine"}
          </span>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="w-[148px]">
              <DatumFeld inputSize="sm" value={anker} onChange={(v) => v && setAnker(v)} aria-label="Zu Datum springen" />
            </div>
            {ansicht === "tag" && (
              <Segmente
                label="Spalten"
                optionen={[
                  { key: "lehrer", label: "Fahrlehrer" },
                  { key: "fahrzeug", label: "Fahrzeuge" },
                ]}
                wert={dimension}
                onChange={setDimension}
              />
            )}
            <Segmente
              label="Ansicht"
              optionen={[
                { key: "tag", label: "Tag" },
                { key: "woche", label: "Woche" },
              ]}
              wert={ansicht}
              onChange={setAnsicht}
            />
            <Button size="sm" onClick={() => neu({ datum: anker })}>
              <Plus /> Termin
            </Button>
          </div>
        </div>

        {ansicht === "tag" ? (
          <TagSpalten
            lanes={lanes}
            pruefungen={tagesPruef}
            dimension={dimension}
            anker={anker}
            heute={heute}
            nowMin={nowMin}
            sel={sel}
            nurBelegt={nurBelegt}
            onNurBelegt={() => setNurBelegt((v) => !v)}
            onEdit={editieren}
            onZiehStart={(lane, e) => {
              const m = minuteAus(e);
              zieht.current = true;
              setSel({ lane, datum: anker, a: m, b: m });
            }}
            onZiehMove={(lane, e) => {
              if (!zieht.current) return;
              const m = minuteAus(e);
              setSel((s) => (s && s.lane === lane ? { ...s, b: m } : s));
            }}
          />
        ) : (
          <WochenHeatmap
            tage={wochentage}
            stunden={stunden}
            pruefungen={pruefungen}
            heute={heute}
            onTag={(d) => {
              setAnker(d);
              setAnsicht("tag");
            }}
          />
        )}

        {/* Legende */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-foreground-secondary">
          {(Object.keys(FAHRSTUNDE_TYPEN) as Fahrstunde["typ"][]).map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: FAHRSTUNDE_FARBE[k] }} aria-hidden="true" />
              {FAHRSTUNDE_TYPEN[k].kurz}
            </span>
          ))}
        </div>
      </div>

      {open && (
        <aside className="w-full xl:sticky xl:top-20 xl:w-[380px] xl:shrink-0">
          <FahrstundePanel key={key} options={options} fahrstunde={bearbeiten} initial={initial} onClose={() => setOpen(false)} />
        </aside>
      )}
    </div>
  );
}

// ===========================================================================
// Tagesansicht: eine Spalte je Fahrlehrer bzw. Fahrzeug, Zeit von oben nach unten
// ===========================================================================
function TagSpalten({
  lanes,
  pruefungen,
  dimension,
  anker,
  heute,
  nowMin,
  sel,
  nurBelegt,
  onNurBelegt,
  onEdit,
  onZiehStart,
  onZiehMove,
}: {
  lanes: { id: string; label: string; events: FahrstundeMitRelationen[] }[];
  pruefungen: Pruef[];
  dimension: Dimension;
  anker: string;
  heute: string;
  nowMin: number;
  sel: { lane: string; datum: string; a: number; b: number } | null;
  nurBelegt: boolean;
  onNurBelegt: () => void;
  onEdit: (s: FahrstundeMitRelationen) => void;
  onZiehStart: (lane: string, e: React.MouseEvent) => void;
  onZiehMove: (lane: string, e: React.MouseEvent) => void;
}) {
  const istHeute = anker === heute;
  const scrollRef = useRef<HTMLDivElement>(null);
  const spalten = `56px repeat(${Math.max(1, lanes.length)}, minmax(128px, 1fr))`;

  // Beim Öffnen und beim Tageswechsel zur passenden Uhrzeit scrollen.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const erster = Math.min(...lanes.flatMap((l) => l.events.map((e) => minuten(e.uhrzeit))), TAG_ENDE);
    const ziel = istHeute ? Math.min(nowMin - 60, erster - 30) : erster - 30;
    el.scrollTop = Math.max(0, y(Math.max(TAG_START, ziel)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anker, dimension]);

  return (
    <div className="overflow-hidden rounded-xl bg-card shadow-panel">
      <div ref={scrollRef} className="overflow-auto scrollbar-thin" style={{ maxHeight: "max(480px, calc(100dvh - 17rem))" }}>
        <div className="grid min-w-full" style={{ gridTemplateColumns: spalten }}>
          {/* Kopfzeile – bleibt beim Scrollen stehen */}
          <div className="sticky left-0 top-0 z-30 border-b border-r border-border bg-card" />
          {lanes.map((lane) => {
            const belegt = lane.events.filter((e) => e.status !== "ausgefallen");
            const min = belegt.reduce((s, e) => s + dauer(e), 0);
            return (
              <div key={lane.id} className="sticky top-0 z-20 min-w-0 border-b border-r border-border bg-card px-3 py-2.5 last:border-r-0">
                <p className={cn("truncate text-13 font-semibold", lane.id === "none" ? "text-foreground-secondary" : "text-foreground")}>{lane.label}</p>
                <p className="text-xs tabular-nums text-foreground-tertiary">
                  {belegt.length ? `${belegt.length} ${belegt.length === 1 ? "Termin" : "Termine"} · ${(min / 60).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Std.` : "frei"}
                </p>
              </div>
            );
          })}
          {lanes.length === 0 && (
            <div className="sticky top-0 z-20 border-b border-border bg-card px-3 py-2.5 text-13 text-foreground-secondary">
              {nurBelegt ? "Heute ist niemand eingeplant." : dimension === "lehrer" ? "Keine aktiven Fahrlehrer." : "Keine aktiven Fahrzeuge."}
            </div>
          )}

          {/* Prüfungen des Tages */}
          {pruefungen.length > 0 && (
            <div className="col-span-full flex flex-wrap items-center gap-1.5 border-b border-border bg-destructive-soft/40 px-3 py-2">
              <span className="mr-1 text-xs font-semibold text-destructive-text">Prüfungen</span>
              {pruefungen.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1.5 rounded-md bg-card px-2 py-0.5 text-xs text-foreground shadow-[inset_0_0_0_1px_rgba(224,67,74,0.35)]"
                  title={`${p.art === "praxis" ? "Praktische Prüfung" : "Theorieprüfung"}${p.pruefstelle ? ` · ${p.pruefstelle}` : ""}`}
                >
                  <span className="font-semibold tabular-nums">{p.uhrzeit ? formatUhrzeit(p.uhrzeit) : "—"}</span>
                  {p.schueler ?? "Prüfung"}
                  <span className="text-foreground-tertiary">{p.art === "praxis" ? "Praxis" : "Theorie"}</span>
                </span>
              ))}
            </div>
          )}

          {/* Zeitleiste links */}
          <div className="sticky left-0 z-10 border-r border-border bg-card" style={{ height: HOEHE }}>
            {STUNDEN.slice(1, -1).map((h) => (
              <span key={h} className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-foreground-tertiary" style={{ top: y(h * 60) }}>
                {pad(h)}:00
              </span>
            ))}
            {istHeute && nowMin > TAG_START && nowMin < TAG_ENDE && (
              <span
                className="absolute right-1 z-10 -translate-y-1/2 rounded-[4px] bg-primary px-1 text-[10px] font-semibold tabular-nums text-primary-foreground"
                style={{ top: y(nowMin) }}
              >
                {minToUhr(nowMin)}
              </span>
            )}
          </div>

          {/* Spalten */}
          {lanes.map((lane) => {
            const spuren = spurenVon(lane.events);
            const auswahl = sel && sel.lane === lane.id ? sel : null;
            return (
              <div
                key={lane.id}
                className="relative min-w-0 select-none border-r border-border last:border-r-0"
                style={{ height: HOEHE }}
                onMouseDown={(e) => onZiehStart(lane.id, e)}
                onMouseMove={(e) => onZiehMove(lane.id, e)}
              >
                {/* Stunden- und Halbstundenlinien */}
                {STUNDEN.slice(0, -1).map((h) => (
                  <div key={h} aria-hidden="true" className="pointer-events-none absolute inset-x-0" style={{ top: y(h * 60), height: STUNDE_PX }}>
                    <div className="h-1/2 border-t border-border" />
                    <div className="h-1/2 border-t border-dashed border-border/70" />
                  </div>
                ))}

                {istHeute && nowMin > TAG_START && nowMin < TAG_ENDE && (
                  <div className="pointer-events-none absolute inset-x-0 z-10 h-px bg-primary" style={{ top: y(nowMin) }} />
                )}

                {auswahl &&
                  (() => {
                    const von = Math.min(auswahl.a, auswahl.b);
                    const bis = Math.max(auswahl.a, auswahl.b) + SNAP;
                    return (
                      <div
                        className="pointer-events-none absolute inset-x-1 z-10 rounded-md border border-primary/60 bg-primary/10 px-1.5 py-1"
                        style={{ top: y(von), height: Math.max((bis - von) * PX_MIN, 12) }}
                      >
                        <span className="text-[11px] font-semibold tabular-nums text-primary-text">
                          {minToUhr(von)} – {minToUhr(bis)}
                        </span>
                      </div>
                    );
                  })()}

                {lane.events.map((ev) => {
                  const start = minuten(ev.uhrzeit);
                  const d = dauer(ev);
                  const { spur, spuren: anzahlSpuren } = spuren.get(ev.id) ?? { spur: 0, spuren: 1 };
                  const ausgefallen = ev.status === "ausgefallen";
                  const farbe = FAHRSTUNDE_FARBE[ev.typ];
                  const hoehe = Math.max(d * PX_MIN - 2, 20);
                  const name = ev.fahrschueler
                    ? `${ev.fahrschueler.vorname} ${ev.fahrschueler.nachname}`
                    : ev.notiz?.trim() || FAHRSTUNDE_TYPEN[ev.typ].label;
                  const meta = dimension === "lehrer" ? ev.fahrzeug?.kennzeichen : ev.fahrlehrer ? `${ev.fahrlehrer.vorname} ${ev.fahrlehrer.nachname}` : null;
                  const breite = 100 / anzahlSpuren;
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={() => onEdit(ev)}
                      title={`${formatUhrzeit(ev.uhrzeit)}–${minToUhr(start + d)} · ${name} · ${FAHRSTUNDE_TYPEN[ev.typ].label}${meta ? ` · ${meta}` : ""}`}
                      className={cn(
                        "absolute z-[5] overflow-hidden rounded-md px-2 py-1 text-left transition-shadow duration-fast",
                        "hover:z-20 hover:shadow-[0_4px_12px_-4px_rgba(16,24,40,0.25)] focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        ausgefallen && "opacity-50",
                      )}
                      style={{
                        top: y(start) + 1,
                        height: hoehe,
                        left: `calc(${spur * breite}% + 3px)`,
                        width: `calc(${breite}% - 6px)`,
                        background: `${farbe}1F`,
                        boxShadow: `inset 3px 0 0 ${farbe}`,
                      }}
                    >
                      <span className={cn("block truncate text-xs font-semibold leading-4 text-foreground", ausgefallen && "line-through")}>{name}</span>
                      {hoehe >= 32 && (
                        <span className="block truncate text-[11px] leading-4 text-foreground-secondary">
                          <span className="tabular-nums">
                            {formatUhrzeit(ev.uhrzeit)}–{minToUhr(start + d)}
                          </span>
                          {` · ${FAHRSTUNDE_TYPEN[ev.typ].kurz}`}
                        </span>
                      )}
                      {hoehe >= 56 && meta && <span className="block truncate text-[11px] leading-4 text-foreground-tertiary">{meta}</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2 text-xs text-foreground-tertiary">
        <span>In eine Spalte ziehen, um einen Termin anzulegen · Termin anklicken zum Bearbeiten</span>
        <button
          type="button"
          onClick={onNurBelegt}
          aria-pressed={nurBelegt}
          className={cn(
            "shrink-0 rounded-md px-2 py-1 font-medium transition-colors",
            nurBelegt ? "bg-primary-soft text-primary-text" : "text-foreground-secondary hover:bg-muted hover:text-foreground",
          )}
        >
          {nurBelegt ? "Alle Spalten zeigen" : "Nur belegte Spalten"}
        </button>
      </div>
    </div>
  );
}

// ===========================================================================
// Wochenansicht: Belegung je Tag und Stunde
// ===========================================================================
function WochenHeatmap({
  tage,
  stunden,
  pruefungen,
  heute,
  onTag,
}: {
  tage: string[];
  stunden: FahrstundeMitRelationen[];
  pruefungen: Pruef[];
  heute: string;
  onTag: (datum: string) => void;
}) {
  const bloecke = STUNDEN.slice(0, -1); // 07 … 20

  const daten = useMemo(() => {
    const map: Record<string, { pro: Record<number, number>; total: number; min: number; pruef: number }> = {};
    for (const d of tage) map[d] = { pro: {}, total: 0, min: 0, pruef: 0 };
    for (const ev of stunden) {
      if (!(ev.datum in map) || ev.status === "ausgefallen") continue;
      const start = minuten(ev.uhrzeit);
      const ende = start + dauer(ev);
      map[ev.datum].total += 1;
      map[ev.datum].min += dauer(ev);
      for (const h of bloecke) {
        const b0 = h * 60;
        if (start < b0 + 60 && ende > b0) map[ev.datum].pro[h] = (map[ev.datum].pro[h] ?? 0) + 1;
      }
    }
    for (const p of pruefungen) if (p.datum in map) map[p.datum].pruef += 1;
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tage, stunden, pruefungen]);

  const maxZelle = Math.max(1, ...tage.flatMap((d) => Object.values(daten[d]?.pro ?? {})));

  return (
    <div className="overflow-hidden rounded-xl bg-card shadow-panel">
      <div className="overflow-x-auto scrollbar-thin">
        <div className="min-w-[760px]">
          <div className="flex items-stretch border-b border-border">
            <div className="sticky left-0 z-10 w-[140px] shrink-0 border-r border-border bg-card px-3 py-2 text-xs font-medium text-foreground-secondary">Tag</div>
            <div className="flex flex-1">
              {bloecke.map((h) => (
                <div key={h} className="flex-1 py-2 text-center text-[11px] tabular-nums text-foreground-tertiary">
                  {pad(h)}
                </div>
              ))}
            </div>
            <div className="w-[96px] shrink-0 border-l border-border px-3 py-2 text-right text-xs font-medium text-foreground-secondary">Summe</div>
          </div>

          {tage.map((d, i) => {
            const info = daten[d];
            const istHeute = d === heute;
            return (
              <button
                key={d}
                type="button"
                onClick={() => onTag(d)}
                className={cn(
                  "flex w-full items-stretch border-b border-border text-left transition-colors last:border-b-0 hover:bg-surface-muted/60",
                  istHeute && "bg-primary-soft/40",
                )}
              >
                <div className="sticky left-0 z-10 flex w-[140px] shrink-0 flex-col justify-center gap-0.5 border-r border-border bg-inherit px-3 py-2.5">
                  <span className={cn("text-13 font-semibold", istHeute ? "text-primary-text" : "text-foreground")}>{WT_LANG[i]}</span>
                  <span className="text-xs tabular-nums text-foreground-tertiary">
                    {fromIso(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                    {info.pruef > 0 && (
                      <span className="ml-1.5 text-destructive-text">
                        · {info.pruef} {info.pruef === 1 ? "Prüfung" : "Prüfungen"}
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex flex-1 items-center gap-0.5 px-0.5">
                  {bloecke.map((h) => {
                    const n = info.pro[h] ?? 0;
                    const staerke = n === 0 ? 0 : 0.18 + (n / maxZelle) * 0.82;
                    return (
                      <span
                        key={h}
                        title={`${pad(h)}:00 · ${n} ${n === 1 ? "Termin" : "Termine"}`}
                        className="flex h-8 flex-1 items-center justify-center rounded-[4px] text-[11px] font-semibold tabular-nums"
                        style={
                          n === 0
                            ? { background: "hsl(var(--muted))", color: "transparent" }
                            : { background: `hsl(var(--primary) / ${staerke})`, color: staerke > 0.55 ? "white" : "hsl(var(--primary-text))" }
                        }
                      >
                        {n || ""}
                      </span>
                    );
                  })}
                </div>
                <div className="flex w-[96px] shrink-0 flex-col items-end justify-center gap-0.5 border-l border-border px-3 py-2.5">
                  <span className="text-13 font-semibold tabular-nums text-foreground">{info.total}</span>
                  <span className="text-xs tabular-nums text-foreground-tertiary">
                    {(info.min / 60).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Std.
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <p className="border-t border-border px-3 py-2 text-xs text-foreground-tertiary">Zahl = Termine in dieser Stunde · Tag anklicken öffnet die Tagesansicht</p>
    </div>
  );
}
