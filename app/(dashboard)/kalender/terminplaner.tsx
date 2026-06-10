"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn, formatUhrzeit } from "@/lib/utils";
import type { Fahrstunde, FahrstundeMitRelationen, FahrstundeTyp } from "@/lib/types";
import { FahrstundeDialog, type FahrstundeInitial, type Option } from "./fahrstunde-dialog";

type Modus = "tag" | "drei" | "woche";

const SPALTEN: Record<Modus, number> = { tag: 1, drei: 3, woche: 7 };

// Termin-Farben je Fahrstunden-Art (wie in der App, aber ohne Orange).
const TERMIN_FARBE: Record<FahrstundeTyp, string> = {
  normal: "#2563EB",
  ueberland: "#16A34A",
  autobahn: "#0891B2",
  nacht: "#4F46E5",
  pruefung: "#DC2626",
};

const TAG_START = 7; // 07:00
const TAG_ENDE = 21; // 21:00
const PX_PRO_MIN = 1;
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
function dauerVon(s: FahrstundeMitRelationen): number {
  return s.dauer_minuten ?? 45;
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

  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);
  const [bearbeiten, setBearbeiten] = useState<Fahrstunde | undefined>();
  const [initial, setInitial] = useState<FahrstundeInitial | undefined>();

  const jetzt = new Date();
  const jetztMin = jetzt.getHours() * 60 + jetzt.getMinutes();

  const tage = useMemo(() => {
    const anzahl = SPALTEN[modus];
    const start = modus === "woche" ? montagOf(fromIso(anker)) : fromIso(anker);
    return Array.from({ length: anzahl }, (_, i) => addDays(start, i));
  }, [modus, anker]);

  const eventsProTag = useMemo(() => {
    const map: Record<string, FahrstundeMitRelationen[]> = {};
    for (const s of stunden) (map[s.datum] ??= []).push(s);
    return map;
  }, [stunden]);

  function blättern(richtung: number) {
    const schritt = SPALTEN[modus];
    setAnker(iso(addDays(fromIso(anker), richtung * schritt)));
  }

  function neueStunde(datum: string, stunde: number) {
    setBearbeiten(undefined);
    setInitial({ datum, uhrzeit: `${pad(stunde)}:00` });
    setKey((k) => k + 1);
    setOpen(true);
  }

  function stundeBearbeiten(s: FahrstundeMitRelationen) {
    setInitial(undefined);
    setBearbeiten(s);
    setKey((k) => k + 1);
    setOpen(true);
  }

  function neueStundeButton() {
    setBearbeiten(undefined);
    setInitial({ datum: anker });
    setKey((k) => k + 1);
    setOpen(true);
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
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => blättern(-1)}
              aria-label="Zurück"
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => blättern(1)}
              aria-label="Weiter"
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm font-semibold capitalize text-foreground">{label}</p>
          {anker !== heute && (
            <button
              type="button"
              onClick={() => setAnker(heute)}
              className="text-xs font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
            >
              Heute
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md bg-muted p-0.5 text-[13px]">
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
                  "rounded px-2.5 py-1 font-medium transition-colors",
                  modus === v
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {l}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={neueStundeButton}>
            <Plus /> <span className="hidden sm:inline">Neue Fahrstunde</span>
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Tipp: Auf eine freie Stelle tippen, um eine Fahrstunde anzulegen – oder einen Termin
        antippen, um ihn zu bearbeiten.
      </p>

      {/* Zeitraster */}
      <div className="overflow-x-auto rounded-lg border bg-card">
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

            return (
              <div key={tagIso} className="flex min-w-[120px] flex-1 flex-col border-r last:border-r-0">
                {/* Tages-Kopf */}
                <div className="flex h-14 flex-col items-center justify-center gap-0.5 border-b">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {wochentag}
                  </span>
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
                      istHeute ? "bg-primary text-primary-foreground" : "text-foreground",
                    )}
                  >
                    {tag.getDate()}
                  </span>
                </div>

                {/* Tages-Raster */}
                <div className="relative" style={{ height: GRID_HOEHE }}>
                  {STUNDEN_ZELLE.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => neueStunde(tagIso, h)}
                      className="absolute left-0 right-0 border-b border-dashed border-border/50 transition-colors hover:bg-accent/60"
                      style={{ top: (h - TAG_START) * 60 * PX_PRO_MIN, height: 60 * PX_PRO_MIN }}
                      aria-label={`${pad(h)}:00 – neue Fahrstunde`}
                    />
                  ))}

                  {tagesEvents.map((s) => {
                    const start = Math.max(minuten(s.uhrzeit), TAG_START * 60);
                    const top = (start - TAG_START * 60) * PX_PRO_MIN;
                    const hoehe = Math.max(dauerVon(s) * PX_PRO_MIN, 20);
                    const { spur, spuren: anzahl } = spuren.get(s.id) ?? { spur: 0, spuren: 1 };
                    const ausgefallen = s.status === "ausgefallen";
                    const name = s.fahrschueler
                      ? `${s.fahrschueler.vorname} ${s.fahrschueler.nachname}`
                      : "Ohne Schüler";
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => stundeBearbeiten(s)}
                        className={cn(
                          "absolute overflow-hidden rounded-md px-1.5 py-1 text-left text-[11px] leading-tight text-white shadow-sm transition hover:z-10 hover:shadow-md",
                          ausgefallen && "line-through",
                        )}
                        style={{
                          top,
                          height: hoehe,
                          left: `calc(${(spur / anzahl) * 100}% + 2px)`,
                          width: `calc(${(1 / anzahl) * 100}% - 4px)`,
                          backgroundColor: ausgefallen ? "#94A3B8" : TERMIN_FARBE[s.typ],
                        }}
                      >
                        <span className="font-semibold">{formatUhrzeit(s.uhrzeit)}</span>{" "}
                        <span className="opacity-95">{name}</span>
                      </button>
                    );
                  })}

                  {/* Jetzt-Linie */}
                  {istHeute && jetztMin >= TAG_START * 60 && jetztMin <= TAG_ENDE * 60 && (
                    <div
                      className="pointer-events-none absolute left-0 right-0 z-20"
                      style={{ top: (jetztMin - TAG_START * 60) * PX_PRO_MIN }}
                    >
                      <div className="h-0 border-t-2 border-red-500" />
                      <div className="absolute -left-1 -top-[5px] h-2 w-2 rounded-full bg-red-500" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <FahrstundeDialog
        key={key}
        open={open}
        onOpenChange={setOpen}
        options={options}
        fahrstunde={bearbeiten}
        initial={initial}
      />
    </div>
  );
}
