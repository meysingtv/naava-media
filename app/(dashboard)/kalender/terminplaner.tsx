"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, User, Car } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn, formatUhrzeit } from "@/lib/utils";
import { FAHRSTUNDE_FARBE, FAHRSTUNDE_TYPEN } from "@/lib/constants";
import type { Fahrstunde, FahrstundeMitRelationen } from "@/lib/types";
import { FahrstundePanel, type FahrstundeInitial, type Option } from "./fahrstunde-panel";

// ---------------------------------------------------------------------------
// Zeit-Raster (der Betriebstag)
// ---------------------------------------------------------------------------
const TAG_START = 7 * 60; // 07:00
const TAG_ENDE = 21 * 60; // 21:00
const SPANNE = TAG_ENDE - TAG_START;
const SNAP = 15;
const ROW = 46; // px Höhe je Spur in einer Lane
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
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
function minuten(uhrzeit: string): number {
  const [h, m] = uhrzeit.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}
function minToUhr(min: number): string {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}
function dauer(s: FahrstundeMitRelationen): number {
  return s.dauer_minuten ?? 45;
}
function pct(min: number): number {
  return ((Math.min(Math.max(min, TAG_START), TAG_ENDE) - TAG_START) / SPANNE) * 100;
}

/** Weist überlappenden Terminen einer Lane Spuren zu (vertikal gestapelt). */
function spurenVon(events: FahrstundeMitRelationen[]): { map: Map<string, number>; spuren: number } {
  const sortiert = [...events].sort((a, b) => minuten(a.uhrzeit) - minuten(b.uhrzeit) || dauer(a) - dauer(b));
  const enden: number[] = [];
  const map = new Map<string, number>();
  for (const ev of sortiert) {
    const start = minuten(ev.uhrzeit);
    const ende = start + dauer(ev);
    let gesetzt = false;
    for (let c = 0; c < enden.length; c++) {
      if (start >= enden[c]) {
        enden[c] = ende;
        map.set(ev.id, c);
        gesetzt = true;
        break;
      }
    }
    if (!gesetzt) {
      map.set(ev.id, enden.length);
      enden.push(ende);
    }
  }
  return { map, spuren: Math.max(1, enden.length) };
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

  // aktuelle Uhrzeit (Jetzt-Linie)
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

  // ---- Drag zum Anlegen (horizontal, innerhalb einer Lane) ----
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
      const bis = Math.max(s.a, s.b);
      const d = bis - von;
      neu({
        datum: s.datum,
        uhrzeit: minToUhr(von),
        dauer_minuten: d >= SNAP ? d : 45,
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
    const frac = (e.clientX - rect.left) / rect.width;
    const roh = TAG_START + frac * SPANNE;
    return Math.min(Math.max(Math.round(roh / SNAP) * SNAP, TAG_START), TAG_ENDE);
  }

  // ---- Tages-Daten ----
  const tagesEvents = useMemo(() => stunden.filter((s) => s.datum === anker), [stunden, anker]);
  const tagesPruef = useMemo(() => pruefungen.filter((p) => p.datum === anker), [pruefungen, anker]);

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

  // ---- Wochen-Daten (Heatmap) ----
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
      ? ankerDate.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" })
      : `${fromIso(wochentage[0]).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })} – ${fromIso(
          wochentage[6],
        ).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}`;

  const gesamtHeute = tagesEvents.filter((e) => e.status !== "ausgefallen").length;

  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
      <div className="min-w-0 flex-1">
        {/* Steuerleiste */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-md border bg-card p-0.5">
            <button type="button" onClick={() => blaettern(-1)} aria-label="Zurück" className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => blaettern(1)} aria-label="Weiter" className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm font-semibold capitalize text-foreground">{label}</p>
          {anker !== heute && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setAnker(heute)}>
              Heute
            </Button>
          )}
          {ansicht === "tag" && (
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {gesamtHeute} {gesamtHeute === 1 ? "Termin" : "Termine"}
            </span>
          )}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {ansicht === "tag" && (
              <div className="inline-flex rounded-md border bg-card p-0.5 text-xs">
                {(
                  [
                    ["lehrer", "Fahrlehrer", User],
                    ["fahrzeug", "Fahrzeuge", Car],
                  ] as [Dimension, string, typeof User][]
                ).map(([v, l, Icon]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setDimension(v)}
                    className={cn(
                      "inline-flex h-7 items-center gap-1.5 rounded-[4px] px-2 font-medium transition-colors",
                      dimension === v ? "bg-primary-soft text-primary-text" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={1.75} /> {l}
                  </button>
                ))}
              </div>
            )}
            {ansicht === "tag" && (
              <button
                type="button"
                onClick={() => setNurBelegt((v) => !v)}
                className={cn(
                  "h-7 rounded-md border px-2 text-xs font-medium transition-colors",
                  nurBelegt ? "border-primary bg-primary-soft text-primary" : "bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                Nur belegte
              </button>
            )}
            <div className="inline-flex rounded-md border bg-card p-0.5 text-xs">
              {(
                [
                  ["tag", "Tag"],
                  ["woche", "Woche"],
                ] as [Ansicht, string][]
              ).map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAnsicht(v)}
                  className={cn(
                    "h-7 rounded-[4px] px-2.5 font-medium transition-colors",
                    ansicht === v ? "bg-primary-soft text-primary-text" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
            <Button size="sm" onClick={() => neu({ datum: anker })}>
              <Plus /> <span className="hidden sm:inline">Termin</span>
            </Button>
          </div>
        </div>

        {ansicht === "tag" ? (
          <TagBoard
            lanes={lanes}
            pruefungen={tagesPruef}
            dimension={dimension}
            anker={anker}
            heute={heute}
            nowMin={nowMin}
            sel={sel}
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
          <WochenHeatmap tage={wochentage} stunden={stunden} pruefungen={pruefungen} heute={heute} onTag={(d) => { setAnker(d); setAnsicht("tag"); }} />
        )}

        {/* Legende */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          {Object.entries(FAHRSTUNDE_TYPEN).map(([k, t]) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <i className="h-2.5 w-1 rounded-full" style={{ background: FAHRSTUNDE_FARBE[k as Fahrstunde["typ"]] }} />
              {t.kurz}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rotate-45 border border-destructive" /> Prüfung
          </span>
        </div>
      </div>

      {open && (
        <div className="w-full xl:sticky xl:top-16 xl:w-[380px] xl:shrink-0">
          <FahrstundePanel key={key} options={options} fahrstunde={bearbeiten} initial={initial} onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Tages-Board: Ressourcen-Lanes mit horizontaler Zeitachse
// ===========================================================================
function TagBoard({
  lanes,
  pruefungen,
  dimension,
  anker,
  heute,
  nowMin,
  sel,
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
  onEdit: (s: FahrstundeMitRelationen) => void;
  onZiehStart: (lane: string, e: React.MouseEvent) => void;
  onZiehMove: (lane: string, e: React.MouseEvent) => void;
}) {
  const istHeute = anker === heute;

  return (
    <div className="overflow-hidden rounded-xl bg-card shadow-panel">
      <div className="overflow-x-auto scrollbar-thin">
        <div className="min-w-[760px]">
          {/* Zeit-Kopf */}
          <div className="flex items-stretch border-b bg-surface-muted/60">
            <div className="sticky left-0 z-20 w-[184px] shrink-0 border-r bg-surface-muted/60 px-3 py-2">
              <span className="label-caps">{dimension === "lehrer" ? "Fahrlehrer" : "Fahrzeug"}</span>
            </div>
            <div className="relative h-8 flex-1">
              {STUNDEN.map((h) => (
                <span key={h} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-[11px] tabular-nums text-muted-foreground" style={{ left: `${pct(h * 60)}%` }}>
                  {pad(h)}
                </span>
              ))}
            </div>
          </div>

          {/* Prüfungen-Streifen */}
          {pruefungen.length > 0 && (
            <div className="flex items-stretch border-b">
              <div className="sticky left-0 z-20 flex w-[184px] shrink-0 items-center gap-1.5 border-r bg-card px-3 py-2">
                <span className="h-2.5 w-2.5 rotate-45 border border-destructive" />
                <span className="text-[13px] font-medium text-foreground">Prüfungen</span>
              </div>
              <div className="relative h-10 flex-1">
                <Raster />
                {pruefungen.map((p) => {
                  const m = p.uhrzeit ? minuten(p.uhrzeit) : TAG_START;
                  return (
                    <span
                      key={p.id}
                      title={`${p.schueler ?? "Prüfung"} · ${p.art === "praxis" ? "Praxis" : "Theorie"}${p.pruefstelle ? " · " + p.pruefstelle : ""}${p.uhrzeit ? " · " + formatUhrzeit(p.uhrzeit) : ""}`}
                      className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 whitespace-nowrap rounded-[4px] border border-destructive/40 bg-destructive-soft px-1.5 py-0.5 text-[11px] font-medium text-destructive"
                      style={{ left: `${pct(m)}%` }}
                    >
                      <span className="h-1.5 w-1.5 rotate-45 border border-destructive" />
                      {p.schueler?.split(" ")[0] ?? "Prüfung"}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Lanes */}
          {lanes.length === 0 ? (
            <p className="px-4 py-12 text-center text-[13px] text-muted-foreground">Keine Einträge – zum Anlegen in eine Zeile ziehen.</p>
          ) : (
            lanes.map((lane) => {
              const { map, spuren } = spurenVon(lane.events);
              const hoehe = Math.max(ROW, spuren * ROW);
              const belegtMin = lane.events.filter((e) => e.status !== "ausgefallen").reduce((s, e) => s + dauer(e), 0);
              const auslastung = Math.min(100, Math.round((belegtMin / SPANNE) * 100));
              const auswahlHier = sel && sel.lane === lane.id ? sel : null;
              return (
                <div key={lane.id} className="flex items-stretch border-b last:border-b-0">
                  {/* Ressourcen-Kopf */}
                  <div className="sticky left-0 z-20 flex w-[184px] shrink-0 flex-col justify-center gap-1 border-r bg-card px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("truncate text-[13px] font-medium", lane.id === "none" ? "text-muted-foreground" : "text-foreground")}>{lane.label}</span>
                      <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{lane.events.length}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-1 flex-1 overflow-hidden rounded-full bg-surface-muted">
                        <span className={cn("block h-full rounded-full", auslastung >= 85 ? "bg-warning" : "bg-primary")} style={{ width: `${auslastung}%` }} />
                      </span>
                      <span className="text-[10px] tabular-nums text-muted-foreground">{(belegtMin / 60).toFixed(1)}h</span>
                    </div>
                  </div>

                  {/* Zeit-Track */}
                  <div
                    className="relative flex-1 select-none"
                    style={{ height: hoehe }}
                    onMouseDown={(e) => onZiehStart(lane.id, e)}
                    onMouseMove={(e) => onZiehMove(lane.id, e)}
                  >
                    <Raster />
                    {istHeute && nowMin >= TAG_START && nowMin <= TAG_ENDE && (
                      <div className="pointer-events-none absolute inset-y-0 z-10 w-px bg-primary" style={{ left: `${pct(nowMin)}%` }}>
                        <span className="absolute -top-0.5 -left-[3px] h-1.5 w-1.5 rounded-full bg-primary" />
                      </div>
                    )}
                    {auswahlHier &&
                      (() => {
                        const von = Math.min(auswahlHier.a, auswahlHier.b);
                        const bis = Math.max(auswahlHier.a, auswahlHier.b);
                        return (
                          <div className="pointer-events-none absolute inset-y-1 z-10 rounded-[4px] border border-primary/50 bg-primary/15" style={{ left: `${pct(von)}%`, width: `${Math.max(pct(bis) - pct(von), 0.5)}%` }}>
                            <span className="absolute left-1 top-0.5 text-[10px] font-semibold text-primary">{minToUhr(von)}{bis > von ? `–${minToUhr(bis)}` : ""}</span>
                          </div>
                        );
                      })()}
                    {lane.events.map((ev) => {
                      const start = minuten(ev.uhrzeit);
                      const d = dauer(ev);
                      const spur = map.get(ev.id) ?? 0;
                      const ausgefallen = ev.status === "ausgefallen";
                      const farbe = FAHRSTUNDE_FARBE[ev.typ];
                      const name = ev.fahrschueler ? `${ev.fahrschueler.vorname} ${ev.fahrschueler.nachname}` : ev.notiz?.trim() || FAHRSTUNDE_TYPEN[ev.typ].kurz;
                      const meta = dimension === "lehrer" ? ev.fahrzeug?.kennzeichen : ev.fahrlehrer ? `${ev.fahrlehrer.vorname} ${ev.fahrlehrer.nachname}` : "";
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={() => onEdit(ev)}
                          title={`${formatUhrzeit(ev.uhrzeit)} · ${name} · ${FAHRSTUNDE_TYPEN[ev.typ].label}${meta ? " · " + meta : ""}`}
                          className={cn(
                            "group absolute z-[5] overflow-hidden rounded-[4px] border bg-card pl-2 pr-1.5 text-left transition-[box-shadow,border-color] duration-fast hover:z-20 hover:border-border-strong hover:shadow-md",
                            ausgefallen && "opacity-55",
                          )}
                          style={{
                            top: spur * ROW + 3,
                            height: ROW - 6,
                            left: `${pct(start)}%`,
                            width: `calc(${Math.max(pct(start + d) - pct(start), 0)}% )`,
                            minWidth: 46,
                            borderLeft: `3px solid ${farbe}`,
                          }}
                        >
                          <span className={cn("flex items-baseline gap-1.5 truncate text-[12px] font-medium leading-tight text-foreground", ausgefallen && "line-through")}>
                            <span className="tabular-nums text-muted-foreground">{formatUhrzeit(ev.uhrzeit)}</span>
                            <span className="truncate">{name}</span>
                          </span>
                          <span className="block truncate text-[10px] leading-tight text-muted-foreground">
                            {FAHRSTUNDE_TYPEN[ev.typ].kurz} · {d}′{meta ? ` · ${meta}` : ""}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      <p className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
        In eine Zeile ziehen legt einen Termin an · Termin anklicken zum Bearbeiten
      </p>
    </div>
  );
}

/** Feine, senkrechte Stunden-Linien im Track. */
function Raster() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {STUNDEN.map((h) => (
        <span key={h} className="absolute inset-y-0 w-px bg-border" style={{ left: `${pct(h * 60)}%` }} />
      ))}
    </div>
  );
}

// ===========================================================================
// Wochen-Ansicht: Auslastungs-Heatmap (Tage × Stunden)
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
  const stundenBlocks = STUNDEN.slice(0, -1); // 07..20 (Blockanfänge)

  // Zählung je Tag/Stunde
  const daten = useMemo(() => {
    const map: Record<string, { pro: Record<number, number>; total: number; min: number; pruef: number }> = {};
    for (const d of tage) map[d] = { pro: {}, total: 0, min: 0, pruef: 0 };
    for (const ev of stunden) {
      if (!(ev.datum in map) || ev.status === "ausgefallen") continue;
      const start = minuten(ev.uhrzeit);
      const ende = start + dauer(ev);
      map[ev.datum].total += 1;
      map[ev.datum].min += dauer(ev);
      for (const h of stundenBlocks) {
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
        <div className="min-w-[720px]">
          {/* Kopf */}
          <div className="flex items-stretch border-b bg-surface-muted/60">
            <div className="sticky left-0 z-10 w-[132px] shrink-0 border-r bg-surface-muted/60 px-3 py-2">
              <span className="label-caps">Tag</span>
            </div>
            <div className="flex flex-1">
              {stundenBlocks.map((h) => (
                <div key={h} className="flex-1 border-l py-2 text-center text-[11px] tabular-nums text-muted-foreground first:border-l-0">
                  {pad(h)}
                </div>
              ))}
            </div>
            <div className="w-[92px] shrink-0 border-l px-3 py-2 text-right">
              <span className="label-caps">Last</span>
            </div>
          </div>

          {/* Zeilen je Tag */}
          {tage.map((d, i) => {
            const info = daten[d];
            const istHeute = d === heute;
            return (
              <button
                key={d}
                type="button"
                onClick={() => onTag(d)}
                className={cn("flex w-full items-stretch border-b text-left transition-colors last:border-b-0 hover:bg-surface-muted/40", istHeute && "bg-primary-soft/25")}
              >
                <div className="sticky left-0 z-10 flex w-[132px] shrink-0 flex-col justify-center gap-0.5 border-r bg-inherit px-3 py-2.5">
                  <span className="flex items-center gap-1.5 text-[13px] font-medium text-foreground">
                    {WT_LANG[i]}
                    {istHeute && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  </span>
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {fromIso(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                    {info.pruef > 0 && <span className="ml-1.5 text-destructive">· {info.pruef} Prüf.</span>}
                  </span>
                </div>
                <div className="flex flex-1">
                  {stundenBlocks.map((h) => {
                    const n = info.pro[h] ?? 0;
                    const intensitaet = n === 0 ? 0 : 0.16 + (n / maxZelle) * 0.84;
                    return (
                      <div key={h} className="flex-1 border-l first:border-l-0" title={n > 0 ? `${pad(h)}:00 · ${n} ${n === 1 ? "Termin" : "Termine"}` : `${pad(h)}:00`}>
                        <div className="flex h-full min-h-[44px] items-center justify-center">
                          <span
                            className="flex h-7 w-full items-center justify-center rounded-[3px] text-[11px] font-semibold tabular-nums"
                            style={
                              n === 0
                                ? { background: "hsl(var(--surface-muted))", color: "transparent" }
                                : { background: `hsl(var(--primary) / ${intensitaet})`, color: intensitaet > 0.55 ? "white" : "hsl(var(--primary-pressed))" }
                            }
                          >
                            {n || ""}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex w-[92px] shrink-0 flex-col items-end justify-center gap-0.5 border-l px-3 py-2.5">
                  <span className="text-[13px] font-semibold tabular-nums text-foreground">{info.total}</span>
                  <span className="text-[11px] tabular-nums text-muted-foreground">{(info.min / 60).toFixed(1)} h</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <p className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">Zahl = Termine in dieser Stunde · Tag anklicken öffnet die Disposition</p>
    </div>
  );
}
