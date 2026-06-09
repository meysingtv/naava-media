"use client";

import { useState } from "react";

import { FAHRSTUNDE_TYPEN } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { formatUhrzeit } from "@/lib/utils";
import type { Fahrstunde, FahrstundeMitRelationen } from "@/lib/types";
import { FahrstundeDialog, type FahrstundeInitial, type Option } from "./fahrstunde-dialog";

const TAG_START = 7; // 07:00
const TAG_ENDE = 21; // 21:00
const PX_PRO_MIN = 1;
const HOEHE = (TAG_ENDE - TAG_START) * 60 * PX_PRO_MIN;
const STUNDEN = Array.from({ length: TAG_ENDE - TAG_START }, (_, i) => TAG_START + i);

function minuten(uhrzeit: string): number {
  const [h, m] = uhrzeit.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

interface Spalte {
  id: string | null;
  name: string;
}

export function KalenderTag({
  datum,
  fahrlehrer,
  stunden,
  options,
}: {
  datum: string;
  fahrlehrer: { id: string; vorname: string; nachname: string }[];
  stunden: FahrstundeMitRelationen[];
  options: { schueler: Option[]; fahrlehrer: Option[]; fahrzeuge: Option[] };
}) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);
  const [bearbeiten, setBearbeiten] = useState<Fahrstunde | undefined>();
  const [initial, setInitial] = useState<FahrstundeInitial | undefined>();

  // Spalten: je Fahrlehrer + eine Spalte für nicht zugeordnete Stunden.
  const spalten: Spalte[] = [
    ...fahrlehrer.map((f) => ({ id: f.id, name: `${f.vorname} ${f.nachname}` })),
    { id: null, name: "Ohne Lehrer" },
  ];

  function neueStunde(lehrerId: string | null, stunde: number) {
    setBearbeiten(undefined);
    setInitial({
      datum,
      uhrzeit: `${String(stunde).padStart(2, "0")}:00`,
      fahrlehrer_id: lehrerId ?? undefined,
    });
    setKey((k) => k + 1);
    setOpen(true);
  }

  function stundeBearbeiten(s: FahrstundeMitRelationen) {
    setInitial(undefined);
    setBearbeiten(s);
    setKey((k) => k + 1);
    setOpen(true);
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <div className="flex min-w-[640px]">
          {/* Zeit-Spalte */}
          <div className="w-14 shrink-0 border-r">
            <div className="h-10 border-b" />
            <div className="relative" style={{ height: HOEHE }}>
              {STUNDEN.map((h) => (
                <div
                  key={h}
                  className="absolute right-2 -translate-y-1/2 text-xs text-muted-foreground"
                  style={{ top: (h - TAG_START) * 60 }}
                >
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>
          </div>

          {/* Fahrlehrer-Spalten */}
          {spalten.map((spalte) => {
            const spaltenStunden = stunden.filter((s) => (s.fahrlehrer_id ?? null) === spalte.id);
            return (
              <div key={spalte.id ?? "ohne"} className="min-w-[140px] flex-1 border-r last:border-r-0">
                <div className="flex h-10 items-center justify-center border-b px-2 text-center text-xs font-semibold">
                  <span className="truncate">{spalte.name}</span>
                </div>
                <div className="relative" style={{ height: HOEHE }}>
                  {/* Klickbare Stunden-Raster */}
                  {STUNDEN.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => neueStunde(spalte.id, h)}
                      className="absolute left-0 right-0 border-b border-dashed border-border/60 transition-colors hover:bg-accent/60"
                      style={{ top: (h - TAG_START) * 60, height: 60 }}
                      aria-label={`${String(h).padStart(2, "0")}:00 – neue Fahrstunde`}
                    />
                  ))}

                  {/* Fahrstunden */}
                  {spaltenStunden.map((s) => {
                    const typ = FAHRSTUNDE_TYPEN[s.typ];
                    const startMin = Math.max(minuten(s.uhrzeit), TAG_START * 60);
                    const top = (startMin - TAG_START * 60) * PX_PRO_MIN;
                    const hoehe = Math.max((s.dauer_minuten ?? 45) * PX_PRO_MIN, 22);
                    const ausgefallen = s.status === "ausgefallen";
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => stundeBearbeiten(s)}
                        className={cn(
                          "absolute left-1 right-1 overflow-hidden rounded-md border px-1.5 py-0.5 text-left text-[11px] leading-tight shadow-sm transition hover:z-10 hover:shadow-md",
                          typ.badge,
                          ausgefallen && "opacity-50 line-through",
                        )}
                        style={{ top, height: hoehe }}
                      >
                        <span className="font-semibold">{formatUhrzeit(s.uhrzeit)}</span>{" "}
                        <span>
                          {s.fahrschueler
                            ? `${s.fahrschueler.vorname} ${s.fahrschueler.nachname}`
                            : typ.kurz}
                        </span>
                      </button>
                    );
                  })}
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
    </>
  );
}
