"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Abschnitt } from "@/components/ui/abschnitt";
import { DatumFeld } from "@/components/ui/datum-feld";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { cn, formatDatum, formatEuro } from "@/lib/utils";
import { ratenplanErstellen, rateBezahltSetzen, rateLoeschen, type RatenState } from "./akte-actions";

interface RateRow {
  id: string;
  betrag: number;
  faellig_am: string | null;
  bezahlt: boolean;
  notiz: string | null;
}

const initial: RatenState = {};

export function RatenBox({ schuelerId, raten }: { schuelerId: string; raten: RateRow[] }) {
  const [state, action] = useFormState(ratenplanErstellen, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const [offen, setOffen] = useState(raten.length === 0);

  useEffect(() => {
    if (state.ok) {
      toast.success("Ratenplan erstellt");
      formRef.current?.reset();
      setOffen(false);
    }
  }, [state]);

  const gesamt = raten.reduce((s, r) => s + Number(r.betrag), 0);
  const bezahlt = raten.filter((r) => r.bezahlt).reduce((s, r) => s + Number(r.betrag), 0);

  return (
    <Abschnitt
      titel="Ratenzahlung"
      meta={raten.length > 0 ? `${formatEuro(bezahlt)} von ${formatEuro(gesamt)} bezahlt` : undefined}
      rahmen
    >
      {raten.length > 0 && (
        <ul className="divide-y divide-border">
          {raten.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-4 py-2.5 text-13">
              <form action={rateBezahltSetzen}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="bezahlt" value={r.bezahlt ? "false" : "true"} />
                <button
                  type="submit"
                  aria-label={r.bezahlt ? "Als offen markieren" : "Als bezahlt markieren"}
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-sm border transition-colors",
                    r.bezahlt ? "border-success bg-success text-white" : "border-border-strong hover:border-foreground-tertiary",
                  )}
                >
                  {r.bezahlt && <Check className="h-3 w-3" strokeWidth={3} />}
                </button>
              </form>
              <span className={cn("min-w-0 flex-1 truncate", r.bezahlt ? "text-foreground-secondary line-through" : "text-foreground")}>
                {r.notiz || "Rate"}
              </span>
              <span className="w-24 shrink-0 text-right tabular-nums text-foreground-secondary">
                {r.faellig_am ? formatDatum(r.faellig_am) : "—"}
              </span>
              <span className="w-24 shrink-0 text-right font-medium tabular-nums text-foreground">{formatEuro(Number(r.betrag))}</span>
              <form action={rateLoeschen}>
                <input type="hidden" name="id" value={r.id} />
                <button
                  type="submit"
                  aria-label="Löschen"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-foreground-tertiary transition-colors hover:bg-destructive-soft hover:text-destructive-text"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {offen ? (
        <form ref={formRef} action={action} className={cn("space-y-3 p-4", raten.length > 0 && "border-t border-border bg-surface-muted")}>
          <FormMessage error={state.error} />
          <input type="hidden" name="schueler_id" value={schuelerId} />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-13 font-medium text-foreground">Gesamtbetrag</label>
              <Input name="gesamt" type="number" step="0.01" min="0" required placeholder="1.200,00" trailing="€" />
            </div>
            <div className="space-y-1.5">
              <label className="text-13 font-medium text-foreground">Anzahl Raten</label>
              <Input name="anzahl" type="number" min="1" max="36" defaultValue={6} />
            </div>
            <div className="space-y-1.5">
              <label className="text-13 font-medium text-foreground">Erste Rate am</label>
              <DatumFeld name="start" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            {raten.length > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={() => setOffen(false)}>
                Abbrechen
              </Button>
            )}
            <SubmitButton size="sm">Ratenplan erstellen</SubmitButton>
          </div>
        </form>
      ) : (
        <div className="border-t border-border px-4 py-2.5">
          <Button type="button" variant="ghost" size="sm" className="-ml-2" onClick={() => setOffen(true)}>
            <Plus /> Weiteren Ratenplan anlegen
          </Button>
        </div>
      )}
    </Abschnitt>
  );
}
