"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { Check, ListChecks, Plus, Trash2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/shared/submit-button";
import { cn, formatDatum } from "@/lib/utils";
import type { Aufgabe } from "@/lib/types";
import { aufgabeErstellen, aufgabeLoeschen, aufgabeStatusSetzen, type AufgabeState } from "./aufgaben-actions";

type AufgabeMitKunde = Aufgabe & {
  fahrschueler: { vorname: string; nachname: string } | null;
};

const PRIO: Record<string, { label: string; dot: string }> = {
  niedrig: { label: "Niedrig", dot: "bg-slate-400" },
  mittel: { label: "Mittel", dot: "bg-amber-500" },
  hoch: { label: "Hoch", dot: "bg-red-500" },
};

const feld =
  "h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const initial: AufgabeState = {};

export function AufgabenCard({
  aufgaben,
  schuelerOptions,
}: {
  aufgaben: AufgabeMitKunde[];
  schuelerOptions: { id: string; label: string }[];
}) {
  const [state, action] = useFormState(aufgabeErstellen, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  const sortiert = [...aufgaben].sort((a, b) => {
    if (a.status !== b.status) return a.status === "offen" ? -1 : 1;
    return (a.faellig_am ?? "9999").localeCompare(b.faellig_am ?? "9999");
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between p-4 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListChecks className="h-4 w-4 text-muted-foreground" /> Aufgaben
        </CardTitle>
        <span className="text-xs text-muted-foreground">
          {aufgaben.filter((a) => a.status === "offen").length} offen
        </span>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {/* Schnell-Anlegen */}
        <form ref={formRef} action={action} className="mb-3 flex flex-wrap items-center gap-2">
          <input name="titel" required placeholder="Neue Aufgabe …" className={cn(feld, "min-w-[160px] flex-1")} />
          <input name="faellig_am" type="date" className={cn(feld, "w-[150px]")} title="Fällig am" />
          <select name="prioritaet" defaultValue="mittel" className={feld} title="Priorität">
            <option value="niedrig">Niedrig</option>
            <option value="mittel">Mittel</option>
            <option value="hoch">Hoch</option>
          </select>
          <select name="schueler_id" defaultValue="" className={cn(feld, "max-w-[160px]")} title="Kunde">
            <option value="">Kein Kunde</option>
            {schuelerOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <SubmitButton size="sm">
            <Plus className="h-4 w-4" /> Hinzufügen
          </SubmitButton>
        </form>
        {state.error && <p className="mb-2 text-xs text-destructive">{state.error}</p>}

        {sortiert.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Keine Aufgaben – alles erledigt. 🎉</p>
        ) : (
          <ul className="divide-y">
            {sortiert.map((a) => {
              const erledigt = a.status === "erledigt";
              const prio = PRIO[a.prioritaet] ?? PRIO.mittel;
              const kunde = a.fahrschueler ? `${a.fahrschueler.vorname} ${a.fahrschueler.nachname}` : null;
              return (
                <li key={a.id} className="flex items-center gap-3 py-2.5">
                  <form action={aufgabeStatusSetzen}>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="status" value={erledigt ? "offen" : "erledigt"} />
                    <button
                      type="submit"
                      aria-label={erledigt ? "Als offen markieren" : "Als erledigt markieren"}
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded border transition-colors",
                        erledigt ? "border-success bg-success text-success-foreground" : "border-input hover:border-foreground",
                      )}
                    >
                      {erledigt && <Check className="h-3.5 w-3.5" />}
                    </button>
                  </form>

                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate text-sm font-medium", erledigt && "text-muted-foreground line-through")}>
                      {a.titel}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                      {a.faellig_am && <span>Fällig {formatDatum(a.faellig_am)}</span>}
                      {kunde && <span>· {kunde}</span>}
                    </div>
                  </div>

                  <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                    <span className={cn("h-2 w-2 rounded-full", prio.dot)} />
                    {prio.label}
                  </span>

                  <form action={aufgabeLoeschen}>
                    <input type="hidden" name="id" value={a.id} />
                    <button
                      type="submit"
                      aria-label="Aufgabe löschen"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
