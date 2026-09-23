"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Auswahl } from "@/components/ui/auswahl";
import { Button } from "@/components/ui/button";
import { DatumFeld } from "@/components/ui/datum-feld";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ZeitFeld } from "@/components/ui/zeit-feld";
import { FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import {
  fahrstundeSpeichern,
  fahrstundeLoeschen,
  fahrstundeStatusSetzen,
  type KalenderState,
} from "./actions";
import { FAHRSTUNDE_FARBE, FAHRSTUNDE_STATUS, FAHRSTUNDE_TYPEN } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Fahrstunde, FahrstundeStatus, FahrstundeTyp } from "@/lib/types";

export interface Option {
  id: string;
  label: string;
}

export interface FahrstundeInitial {
  datum?: string;
  uhrzeit?: string;
  dauer_minuten?: number;
  fahrlehrer_id?: string;
  fahrzeug_id?: string;
  typ?: FahrstundeTyp;
}

const initialState: KalenderState = {};
const TYPEN = Object.keys(FAHRSTUNDE_TYPEN) as FahrstundeTyp[];
const STATUS = Object.keys(FAHRSTUNDE_STATUS) as FahrstundeStatus[];

/**
 * Termin anlegen oder bearbeiten – Seitenleiste neben dem Kalender. Art als
 * farbige Auswahl oben, darunter Zeit, Personen und Fahrzeug; der Fuß
 * bleibt immer sichtbar.
 */
export function FahrstundePanel({
  options,
  fahrstunde,
  initial,
  onClose,
}: {
  options: { schueler: Option[]; fahrlehrer: Option[]; fahrzeuge: Option[] };
  fahrstunde?: Fahrstunde;
  initial?: FahrstundeInitial;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, action] = useFormState(fahrstundeSpeichern, initialState);
  const modusNeu = useRef(false);
  const heute = new Date().toISOString().slice(0, 10);
  const istBearbeiten = Boolean(fahrstunde);

  const [datum, setDatum] = useState(fahrstunde?.datum ?? initial?.datum ?? heute);
  const [uhrzeit, setUhrzeit] = useState(fahrstunde?.uhrzeit?.slice(0, 5) ?? initial?.uhrzeit ?? "09:00");
  const [dauer, setDauer] = useState(String(fahrstunde?.dauer_minuten ?? initial?.dauer_minuten ?? 45));
  const [typ, setTyp] = useState<FahrstundeTyp>(fahrstunde?.typ ?? initial?.typ ?? "normal");
  const [schuelerId, setSchuelerId] = useState(fahrstunde?.schueler_id ?? "");
  const [lehrerId, setLehrerId] = useState(fahrstunde?.fahrlehrer_id ?? initial?.fahrlehrer_id ?? "");
  const [fahrzeugId, setFahrzeugId] = useState(fahrstunde?.fahrzeug_id ?? initial?.fahrzeug_id ?? "");
  const [notiz, setNotiz] = useState(fahrstunde?.notiz ?? "");

  useEffect(() => {
    if (!state.ok) return;
    toast.success(istBearbeiten ? "Termin aktualisiert" : "Termin eingetragen");
    router.refresh();
    if (modusNeu.current) {
      modusNeu.current = false;
      setSchuelerId("");
      setNotiz("");
    } else {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl bg-card shadow-panel lg:h-[calc(100vh-7rem)]">
      {/* Kopf */}
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3.5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{istBearbeiten ? "Termin bearbeiten" : "Neuer Termin"}</h2>
          <p className="mt-0.5 text-xs text-foreground-secondary">
            {istBearbeiten ? FAHRSTUNDE_TYPEN[fahrstunde!.typ]?.label : "Fahrstunde, Prüfung oder sonstigen Termin eintragen"}
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Schließen" className="-mr-1.5 -mt-0.5">
          <X />
        </Button>
      </div>

      {/* Status und Löschen (nur beim Bearbeiten) */}
      {fahrstunde && (
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <form action={fahrstundeStatusSetzen} onSubmit={onClose} className="min-w-0 flex-1">
            <input type="hidden" name="id" value={fahrstunde.id} />
            <div role="group" aria-label="Status" className="inline-flex max-w-full rounded-md bg-surface-muted p-0.5">
              {STATUS.map((s) => {
                const aktiv = fahrstunde.status === s;
                return (
                  <button
                    key={s}
                    type="submit"
                    name="status"
                    value={s}
                    aria-pressed={aktiv}
                    disabled={aktiv}
                    className={cn(
                      "h-7 truncate rounded-[5px] px-2.5 text-xs font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
                      aktiv ? "bg-card text-foreground shadow-xs" : "text-foreground-secondary hover:text-foreground",
                    )}
                  >
                    {FAHRSTUNDE_STATUS[s].label}
                  </button>
                );
              })}
            </div>
          </form>
          <form action={fahrstundeLoeschen} onSubmit={onClose} className="shrink-0">
            <input type="hidden" name="id" value={fahrstunde.id} />
            <Button
              type="submit"
              variant="outline"
              size="icon-sm"
              aria-label="Termin löschen"
              title="Termin löschen"
              className="text-foreground-secondary hover:bg-destructive-soft hover:text-destructive-text"
            >
              <Trash2 />
            </Button>
          </form>
        </div>
      )}

      {/* Formular mit fest angedocktem Fuß */}
      <form action={action} className="flex min-h-0 flex-1 flex-col">
        {fahrstunde && <input type="hidden" name="id" value={fahrstunde.id} />}
        <input type="hidden" name="typ" value={typ} />

        <div className="flex-1 space-y-5 overflow-y-auto p-4 scrollbar-thin">
          <FormMessage error={state.error} />

          <div>
            <p className="mb-1.5 text-13 font-medium text-foreground">Art</p>
            <div role="radiogroup" aria-label="Art des Termins" className="flex flex-wrap gap-1.5">
              {TYPEN.map((t) => {
                const aktiv = typ === t;
                return (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={aktiv}
                    onClick={() => setTyp(t)}
                    className={cn(
                      "inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
                      aktiv
                        ? "border-transparent text-white"
                        : "border-border-strong bg-card text-foreground-secondary hover:bg-surface-muted hover:text-foreground",
                    )}
                    style={aktiv ? { background: FAHRSTUNDE_FARBE[t] } : undefined}
                  >
                    {!aktiv && <span className="h-2 w-2 rounded-full" style={{ background: FAHRSTUNDE_FARBE[t] }} aria-hidden="true" />}
                    {FAHRSTUNDE_TYPEN[t].kurz}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_96px_88px] gap-3">
            <Field label="Datum" required>
              <DatumFeld name="datum" required value={datum} onChange={setDatum} />
            </Field>
            <Field label="Beginn" required>
              <ZeitFeld name="uhrzeit" required value={uhrzeit} onChange={setUhrzeit} />
            </Field>
            <Field label="Dauer" required>
              <Input
                name="dauer_minuten"
                type="number"
                step="5"
                min="15"
                value={dauer}
                onChange={(e) => setDauer(e.target.value)}
                trailing="Min."
              />
            </Field>
          </div>

          <Field label="Fahrschüler">
            <Auswahl
              name="schueler_id"
              optionen={options.schueler.map((s) => ({ value: s.id, label: s.label }))}
              value={schuelerId}
              onChange={setSchuelerId}
              leerLabel="Ohne Schüler"
              placeholder="Ohne Schüler"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fahrlehrer">
              <Auswahl
                name="fahrlehrer_id"
                optionen={options.fahrlehrer.map((f) => ({ value: f.id, label: f.label }))}
                value={lehrerId}
                onChange={setLehrerId}
                leerLabel="Niemand"
                placeholder="Niemand"
              />
            </Field>
            <Field label="Fahrzeug">
              <Auswahl
                name="fahrzeug_id"
                optionen={options.fahrzeuge.map((f) => ({ value: f.id, label: f.label }))}
                value={fahrzeugId}
                onChange={setFahrzeugId}
                leerLabel="Kein Fahrzeug"
                placeholder="Kein Fahrzeug"
              />
            </Field>
          </div>

          <Field label={typ === "sonstiges" ? "Titel" : "Notiz"}>
            <Textarea
              name="notiz"
              rows={3}
              value={notiz}
              onChange={(e) => setNotiz(e.target.value)}
              placeholder={typ === "sonstiges" ? "z. B. Fahrzeug waschen" : "Optional"}
            />
          </Field>
        </div>

        {/* Fuß – immer ganz unten */}
        <div className="flex items-center justify-end gap-2 border-t border-border bg-card px-4 py-3">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="mr-auto">
            Abbrechen
          </Button>
          {!istBearbeiten && (
            <SubmitButton
              size="sm"
              variant="outline"
              title="Speichern und gleich den nächsten Termin eintragen"
              onClick={() => (modusNeu.current = true)}
            >
              Speichern und neu
            </SubmitButton>
          )}
          <SubmitButton size="sm" onClick={() => (modusNeu.current = false)}>
            Speichern
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
