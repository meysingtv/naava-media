"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { Check, Search, Users } from "lucide-react";
import { toast } from "sonner";

import { anwesenheitSpeichern, type TheoriestundeState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/shared/submit-button";
import { SchuelerAvatar } from "@/components/shared/schueler-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

export interface AnwesenheitSchueler {
  id: string;
  vorname: string;
  nachname: string;
  avatar_farbe: string;
}

const initial: TheoriestundeState = {};

export function AnwesenheitForm({
  theoriestundeId,
  schueler,
  initialPresent,
}: {
  theoriestundeId: string;
  schueler: AnwesenheitSchueler[];
  initialPresent: string[];
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
    return schueler.filter((s) =>
      `${s.vorname} ${s.nachname}`.toLowerCase().includes(q),
    );
  }, [schueler, filter]);

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (schueler.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Noch keine Schüler"
        description="Lege zuerst Fahrschüler an, um ihre Anwesenheit zu erfassen."
      />
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="theoriestunde_id" value={theoriestundeId} />
      {/* Anwesende werden – unabhängig vom Filter – immer mitgesendet */}
      {Array.from(checked).map((id) => (
        <input key={id} type="hidden" name="anwesend" value={id} />
      ))}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm">
          <span className="font-semibold text-foreground">{checked.size}</span>
          <span className="text-muted-foreground"> von {schueler.length} anwesend</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setChecked(new Set(schueler.map((s) => s.id)))}
          >
            Alle
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setChecked(new Set())}
          >
            Keine
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Schüler suchen …"
          className="pl-9"
        />
      </div>

      <ul className="divide-y rounded-lg border">
        {gefiltert.map((s) => {
          const an = checked.has(s.id);
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => toggle(s.id)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                  an ? "bg-primary/5" : "hover:bg-muted/50",
                )}
              >
                <SchuelerAvatar
                  vorname={s.vorname}
                  nachname={s.nachname}
                  farbe={s.avatar_farbe}
                  className="h-9 w-9 text-xs"
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {s.vorname} {s.nachname}
                </span>
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                    an
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background",
                  )}
                >
                  {an && <Check className="h-3.5 w-3.5" />}
                </span>
              </button>
            </li>
          );
        })}
        {gefiltert.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-muted-foreground">
            Kein Schüler gefunden.
          </li>
        )}
      </ul>

      <div className="flex justify-end">
        <SubmitButton>Anwesenheit speichern</SubmitButton>
      </div>
    </form>
  );
}
