"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { Check, Search } from "lucide-react";
import { toast } from "sonner";

import { anwesenheitSpeichern, type TheoriestundeState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { SchuelerAvatar } from "@/components/shared/schueler-avatar";
import { SubmitButton } from "@/components/shared/submit-button";
import { cn } from "@/lib/utils";

export interface AnwesenheitSchueler {
  id: string;
  vorname: string;
  nachname: string;
  avatar_farbe: string;
}

const initial: TheoriestundeState = {};

/**
 * Anwesenheit einer Theoriestunde: Schüler antippen, speichern. Die Suche
 * filtert nur die Anzeige – angehakte Schüler werden immer mitgesendet.
 */
export function AnwesenheitForm({
  theoriestundeId,
  schueler,
  initialPresent,
  max,
}: {
  theoriestundeId: string;
  schueler: AnwesenheitSchueler[];
  initialPresent: string[];
  max?: number | null;
}) {
  const [checked, setChecked] = useState<Set<string>>(() => new Set(initialPresent));
  const [filter, setFilter] = useState("");
  const [state, action] = useFormState(anwesenheitSpeichern, initial);

  useEffect(() => {
    if (state.ok) toast.success("Anwesenheit gespeichert");
    if (state.error) toast.error(state.error);
  }, [state]);

  const gefiltert = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return schueler;
    return schueler.filter((s) => `${s.vorname} ${s.nachname}`.toLowerCase().includes(q));
  }, [schueler, filter]);

  function umschalten(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const geaendert =
    checked.size !== initialPresent.length || initialPresent.some((id) => !checked.has(id));

  return (
    <form action={action} className="min-w-0">
      <input type="hidden" name="theoriestunde_id" value={theoriestundeId} />
      {Array.from(checked).map((id) => (
        <input key={id} type="hidden" name="anwesend" value={id} />
      ))}

      <Panel padding="none">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-foreground">Anwesenheit</h2>
            <p className="text-13 text-foreground-secondary">
              <span className="font-medium tabular-nums text-foreground">{checked.size}</span>
              {max ? ` von ${max} Plätzen` : ` von ${schueler.length} Schülern`} anwesend
            </p>
          </div>
          <div className="w-full sm:w-56">
            <Input
              inputSize="sm"
              leadingIcon={Search}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Schüler suchen"
              aria-label="Schüler suchen"
            />
          </div>
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setChecked(new Set(schueler.map((s) => s.id)))}>
              Alle
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setChecked(new Set())}>
              Keine
            </Button>
          </div>
        </div>

        {schueler.length === 0 ? (
          <p className="px-4 py-10 text-center text-13 text-foreground-secondary">
            Noch keine Schüler angelegt – ihre Anwesenheit lässt sich danach hier eintragen.
          </p>
        ) : (
          <ul className="max-h-[560px] divide-y divide-border overflow-y-auto scrollbar-thin">
            {gefiltert.map((s) => {
              const an = checked.has(s.id);
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={an}
                    onClick={() => umschalten(s.id)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70",
                      an ? "bg-primary-soft/60 hover:bg-primary-soft" : "hover:bg-surface-muted/60",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] transition-colors",
                        an ? "border-primary bg-primary text-primary-foreground" : "border-border-strong bg-card text-transparent",
                      )}
                    >
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <SchuelerAvatar vorname={s.vorname} nachname={s.nachname} className="h-7 w-7 text-[11px]" />
                    <span className="min-w-0 flex-1 truncate text-13 font-medium text-foreground">
                      {s.vorname} {s.nachname}
                    </span>
                    {an && <span className="shrink-0 text-xs font-medium text-primary-text">Anwesend</span>}
                  </button>
                </li>
              );
            })}
            {gefiltert.length === 0 && (
              <li className="px-4 py-8 text-center text-13 text-foreground-secondary">Kein Schüler gefunden.</li>
            )}
          </ul>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-border px-4 py-3">
          {geaendert && <span className="mr-auto text-13 text-foreground-secondary">Nicht gespeicherte Änderungen</span>}
          <SubmitButton size="sm" disabled={schueler.length === 0}>
            Anwesenheit speichern
          </SubmitButton>
        </div>
      </Panel>
    </form>
  );
}
