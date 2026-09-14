"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { Check, CreditCard, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Ratenzahlung
        </CardTitle>
        <CreditCard className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        {raten.length > 0 && (
          <div className="flex items-center justify-between rounded-md bg-surface px-3 py-2 text-sm">
            <span className="text-muted-foreground">Bezahlt</span>
            <span className="font-semibold tabular-nums">
              {formatEuro(bezahlt)} / {formatEuro(gesamt)}
            </span>
          </div>
        )}

        {raten.length > 0 && (
          <div className="divide-y rounded-md border">
            {raten.map((r) => (
              <div key={r.id} className="flex items-center gap-2.5 px-3 py-2 text-sm">
                <form action={rateBezahltSetzen}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="bezahlt" value={r.bezahlt ? "false" : "true"} />
                  <button
                    type="submit"
                    aria-label={r.bezahlt ? "Als offen markieren" : "Als bezahlt markieren"}
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border transition-colors",
                      r.bezahlt
                        ? "border-success bg-success text-white"
                        : "border-border-strong hover:border-success",
                    )}
                  >
                    {r.bezahlt && <Check className="h-3 w-3" strokeWidth={3} />}
                  </button>
                </form>
                <span className={cn("min-w-0 flex-1 truncate", r.bezahlt && "text-muted-foreground line-through")}>
                  {r.notiz || "Rate"}
                  {r.faellig_am ? ` · ${formatDatum(r.faellig_am)}` : ""}
                </span>
                <span className="shrink-0 font-medium tabular-nums">{formatEuro(Number(r.betrag))}</span>
                <form action={rateLoeschen}>
                  <input type="hidden" name="id" value={r.id} />
                  <button
                    type="submit"
                    aria-label="Löschen"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive-soft hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        {offen ? (
          <form ref={formRef} action={action} className="space-y-3 rounded-md border bg-surface/50 p-3">
            <FormMessage error={state.error} />
            <input type="hidden" name="schueler_id" value={schuelerId} />
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Gesamt €</label>
                <Input name="gesamt" type="number" step="0.01" min="0" required placeholder="1200" className="h-9" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Raten</label>
                <Input name="anzahl" type="number" min="1" max="36" defaultValue={6} className="h-9" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Erste am</label>
                <Input name="start" type="date" className="h-9" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              {raten.length > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={() => setOffen(false)}>
                  Abbrechen
                </Button>
              )}
              <SubmitButton size="sm">Plan erstellen</SubmitButton>
            </div>
          </form>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => setOffen(true)}>
            <Plus /> Weiteren Ratenplan
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
