"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { Check, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import {
  fahrstundeSpeichern,
  fahrstundeLoeschen,
  fahrstundeStatusSetzen,
  type KalenderState,
} from "./actions";
import { FAHRSTUNDE_TYPEN } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Fahrstunde, FahrstundeTyp } from "@/lib/types";

export interface Option {
  id: string;
  label: string;
}

export interface FahrstundeInitial {
  datum?: string;
  uhrzeit?: string;
  dauer_minuten?: number;
  fahrlehrer_id?: string;
  typ?: FahrstundeTyp;
}

const feld =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const initialState: KalenderState = {};

function F({ label, children, req }: { label: string; children: React.ReactNode; req?: boolean }) {
  return (
    <div className="min-w-0">
      <label className="mb-1 block text-[13px] text-foreground/70">
        {label}
        {req && <span className="text-destructive"> *</span>}
      </label>
      {children}
    </div>
  );
}

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
  const [uhrzeit, setUhrzeit] = useState(
    fahrstunde?.uhrzeit?.slice(0, 5) ?? initial?.uhrzeit ?? "09:00",
  );
  const [dauer, setDauer] = useState(String(fahrstunde?.dauer_minuten ?? initial?.dauer_minuten ?? 45));
  const [typ, setTyp] = useState<FahrstundeTyp>(fahrstunde?.typ ?? initial?.typ ?? "normal");
  const [schuelerId, setSchuelerId] = useState(fahrstunde?.schueler_id ?? "");
  const [lehrerId, setLehrerId] = useState(fahrstunde?.fahrlehrer_id ?? initial?.fahrlehrer_id ?? "");
  const [fahrzeugId, setFahrzeugId] = useState(fahrstunde?.fahrzeug_id ?? "");
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
    <div className="flex flex-col overflow-hidden rounded-lg border bg-card lg:h-[calc(100vh-7rem)]">
      {/* Kopf */}
      <div className="flex items-start justify-between gap-3 border-b p-4">
        <div>
          <h2 className="text-base font-bold tracking-tight">
            {istBearbeiten ? "Termin bearbeiten" : "Neuer Termin"}
          </h2>
          <p className="text-xs text-muted-foreground">Plane einen Termin für deinen Betrieb.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Schließen"
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Status (nur Bearbeiten) */}
      {fahrstunde && (
        <div className="flex items-center gap-2 border-b p-3">
          <span className="shrink-0 text-xs font-medium text-muted-foreground">Status</span>
          <form action={fahrstundeStatusSetzen} onSubmit={onClose} className="min-w-0 flex-1">
            <input type="hidden" name="id" value={fahrstunde.id} />
            <select
              name="status"
              defaultValue={fahrstunde.status}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              className={cn(feld, "max-w-[200px]")}
            >
              <option value="geplant">Geplant</option>
              <option value="abgeschlossen">Abgeschlossen</option>
              <option value="ausgefallen">Ausgefallen</option>
            </select>
          </form>
          <form action={fahrstundeLoeschen} onSubmit={onClose} className="shrink-0">
            <input type="hidden" name="id" value={fahrstunde.id} />
            <Button type="submit" variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" /> Löschen
            </Button>
          </form>
        </div>
      )}

      {/* Formular mit fest angedocktem Footer */}
      <form action={action} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <FormMessage error={state.error} />
          {fahrstunde && <input type="hidden" name="id" value={fahrstunde.id} />}

          <div className="grid grid-cols-2 gap-3">
            <F label="Datum" req>
              <input name="datum" type="date" required value={datum} onChange={(e) => setDatum(e.target.value)} className={feld} />
            </F>
            <div className="grid grid-cols-2 gap-2">
              <F label="Uhrzeit" req>
                <input name="uhrzeit" type="time" required value={uhrzeit} onChange={(e) => setUhrzeit(e.target.value)} className={feld} />
              </F>
              <F label="Min." req>
                <input name="dauer_minuten" type="number" step="5" min="15" value={dauer} onChange={(e) => setDauer(e.target.value)} className={feld} />
              </F>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <F label="Terminart">
              <div className="flex items-center gap-2">
                <span className={cn("h-3 w-3 shrink-0 rounded-full", FAHRSTUNDE_TYPEN[typ].dot)} />
                <select name="typ" value={typ} onChange={(e) => setTyp(e.target.value as FahrstundeTyp)} className={feld}>
                  {(Object.keys(FAHRSTUNDE_TYPEN) as FahrstundeTyp[]).map((t) => (
                    <option key={t} value={t}>
                      {FAHRSTUNDE_TYPEN[t].label}
                    </option>
                  ))}
                </select>
              </div>
            </F>
            <F label="Fahrlehrer / Verwaltung">
              <select name="fahrlehrer_id" value={lehrerId} onChange={(e) => setLehrerId(e.target.value)} className={feld}>
                <option value="">Niemand zugewiesen</option>
                {options.fahrlehrer.map((f) => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>
            </F>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <F label="Fahrschüler">
              <select name="schueler_id" value={schuelerId} onChange={(e) => setSchuelerId(e.target.value)} className={feld}>
                <option value="">Ohne Schüler</option>
                {options.schueler.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </F>
            <F label="Fahrzeug">
              <select name="fahrzeug_id" value={fahrzeugId} onChange={(e) => setFahrzeugId(e.target.value)} className={feld}>
                <option value="">Kein Fahrzeug</option>
                {options.fahrzeuge.map((f) => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>
            </F>
          </div>

          <F label="Notiz / Titel">
            <textarea
              name="notiz"
              rows={3}
              value={notiz}
              onChange={(e) => setNotiz(e.target.value)}
              placeholder={typ === "sonstiges" ? "z. B. Fahrzeug waschen" : "Notiz …"}
              className={cn(feld, "h-auto py-2")}
            />
          </F>
        </div>

        {/* Footer – immer ganz unten, alle in einer Reihe */}
        <div className="flex items-center justify-end gap-1.5 border-t bg-card p-3">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            <X className="h-4 w-4" /> Abbrechen
          </Button>
          <SubmitButton size="sm" onClick={() => (modusNeu.current = false)}>
            <Check className="h-4 w-4" /> Speichern
          </SubmitButton>
          {!istBearbeiten && (
            <SubmitButton
              size="sm"
              variant="success"
              title="Speichern und neuen Termin anlegen"
              onClick={() => (modusNeu.current = true)}
            >
              <Plus className="h-4 w-4" /> Neu
            </SubmitButton>
          )}
        </div>
      </form>
    </div>
  );
}
