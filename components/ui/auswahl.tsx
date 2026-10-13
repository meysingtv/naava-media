"use client";

import * as React from "react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Radix erlaubt keinen leeren Wert je Eintrag – intern steht dafür dieser Platzhalter. */
const LEER = "__leer__";

export interface AuswahlOption {
  value: string;
  label: string;
}

export interface AuswahlProps {
  /** Name für Formulare – übermittelt wird der gewählte Wert, leer = "". */
  name?: string;
  id?: string;
  optionen: AuswahlOption[];
  /** Zusätzliche Einträge in benannten Gruppen (unter den `optionen`). */
  gruppen?: { label: string; optionen: AuswahlOption[] }[];
  /** Unkontrolliert: Startwert. */
  defaultValue?: string | null;
  /** Kontrolliert: aktueller Wert ("" = nichts gewählt). */
  value?: string;
  onChange?: (wert: string) => void;
  /** Beschriftung eines „leeren" Eintrags (z. B. „—" oder „Keine Angabe"). Ohne: kein leerer Eintrag. */
  leerLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  inputSize?: "sm" | "default";
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

/**
 * Auswahlfeld im Stil der App (ersetzt `<select>` im Browser-Look): gleiche
 * Höhe und Kante wie das Eingabefeld, Liste im Popover. Für Formulare trägt
 * ein verstecktes Feld den Wert, damit die Server-Aktionen unverändert
 * bleiben.
 */
export function Auswahl({
  name,
  id,
  optionen,
  gruppen,
  defaultValue,
  value,
  onChange,
  leerLabel,
  placeholder = "Bitte wählen",
  disabled,
  inputSize = "default",
  className,
  ...aria
}: AuswahlProps) {
  const kontrolliert = value !== undefined;
  const [intern, setIntern] = React.useState(defaultValue ?? "");
  const wert = kontrolliert ? value : intern;

  function setzen(neu: string) {
    const echt = neu === LEER ? "" : neu;
    if (!kontrolliert) setIntern(echt);
    onChange?.(echt);
  }

  return (
    <>
      {name && <input type="hidden" name={name} value={wert} />}
      <Select value={wert === "" ? (leerLabel ? LEER : "") : wert} onValueChange={setzen} disabled={disabled}>
        <SelectTrigger id={id} triggerSize={inputSize} className={className} {...aria}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {leerLabel && <SelectItem value={LEER}>{leerLabel}</SelectItem>}
          {optionen.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
          {gruppen?.map((g) =>
            g.optionen.length ? (
              <SelectGroup key={g.label}>
                <SelectLabel>{g.label}</SelectLabel>
                {g.optionen.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ) : null,
          )}
        </SelectContent>
      </Select>
    </>
  );
}
