"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { CalendarClock, CheckCircle2, Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn, formatDatum, formatUhrzeit } from "@/lib/utils";
import { wochentagKurz } from "@/lib/zeit";
import type { AnfrageStatus, FahrstundeAnfrage } from "@/lib/types";
import { anfrageStellen, anfrageZurueckziehen, type AnfrageZustand } from "./anfrage-actions";

export interface AnfrageRegeln {
  erlaubt: boolean;
  vorlaufStunden: number;
  maxOffen: number;
  offen: number;
}

const STATUS: Record<AnfrageStatus, { label: string; variant: "warning" | "success" | "destructive" | "secondary" }> = {
  offen: { label: "Angefragt", variant: "warning" },
  angenommen: { label: "Angenommen", variant: "success" },
  abgelehnt: { label: "Abgelehnt", variant: "destructive" },
  zurueckgezogen: { label: "Zurückgezogen", variant: "secondary" },
};

const FELD =
  "h-11 w-full rounded-lg border border-input bg-card px-3 text-[15px] text-foreground outline-none transition-[border-color,box-shadow] focus:border-primary focus:ring-[3px] focus:ring-primary/20";

function Absenden() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="h-11 flex-1 text-sm" loading={pending}>
      Anfrage senden
    </Button>
  );
}

/**
 * Fahrstunden-Anfragen im Portal: Wunschtermin anfragen, Stand sehen,
 * offene Anfragen zurückziehen. Der Fahrlehrer bestätigt – erst dann
 * steht die Stunde unter „Anstehend".
 */
export function AnfrageBereich({
  regeln,
  fahrlehrer,
  anfragen,
  minDatum,
  maxDatum,
}: {
  regeln: AnfrageRegeln | null;
  fahrlehrer: { id: string; name: string }[];
  anfragen: FahrstundeAnfrage[];
  minDatum: string;
  maxDatum: string;
}) {
  const [offen, setOffen] = React.useState(false);
  const [dauer, setDauer] = React.useState<45 | 90>(45);
  const [gesendet, setGesendet] = React.useState(false);
  const [state, formAction] = useFormState<AnfrageZustand, FormData>(anfrageStellen, {});
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state.ok) {
      setOffen(false);
      setGesendet(true);
      formRef.current?.reset();
      setDauer(45);
    }
  }, [state]);

  const namen = new Map(fahrlehrer.map((f) => [f.id, f.name]));
  const erlaubt = Boolean(regeln?.erlaubt);
  const limitErreicht = erlaubt && regeln != null && regeln.offen >= regeln.maxOffen;

  if (!erlaubt && anfragen.length === 0) return null;

  return (
    <section id="anfragen" className="scroll-mt-20 space-y-3">
      {erlaubt &&
        (offen ? (
          <Card className="p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">Fahrstunde anfragen</h2>
                <p className="mt-0.5 text-13 text-muted-foreground">
                  Dein Fahrlehrer bestätigt den Termin. Mindestens {regeln?.vorlaufStunden} Std. im Voraus.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOffen(false)}
                aria-label="Schließen"
                className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-surface"
              >
                <X className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </button>
            </div>

            <form ref={formRef} action={formAction} data-slot="form">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1 block text-13 font-medium text-foreground">Datum</span>
                    <input type="date" name="datum" required min={minDatum} max={maxDatum} className={FELD} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-13 font-medium text-foreground">Uhrzeit</span>
                    <input type="time" name="uhrzeit" required min="06:00" max="21:00" step={900} className={FELD} />
                  </label>
                </div>

                <fieldset>
                  <legend className="mb-1 block text-13 font-medium text-foreground">Dauer</legend>
                  <input type="hidden" name="dauer" value={dauer} />
                  <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
                    {([45, 90] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        aria-pressed={dauer === d}
                        onClick={() => setDauer(d)}
                        className={cn(
                          "h-9 rounded-md text-sm font-medium transition-colors",
                          dauer === d ? "bg-card text-foreground shadow-xs" : "text-muted-foreground",
                        )}
                      >
                        {d === 45 ? "45 Min." : "90 Min. (Doppelstunde)"}
                      </button>
                    ))}
                  </div>
                </fieldset>

                {fahrlehrer.length > 1 && (
                  <label className="block">
                    <span className="mb-1 block text-13 font-medium text-foreground">Fahrlehrer</span>
                    <select name="fahrlehrer" defaultValue="" className={FELD}>
                      <option value="">Egal – wer Zeit hat</option>
                      {fahrlehrer.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="block">
                  <span className="mb-1 block text-13 font-medium text-foreground">
                    Nachricht <span className="font-normal text-muted-foreground">(optional)</span>
                  </span>
                  <textarea
                    name="notiz"
                    rows={2}
                    maxLength={500}
                    placeholder="z. B. Abholung zu Hause, Autobahn üben"
                    className={cn(FELD, "h-auto py-2.5")}
                  />
                </label>

                {state.error && (
                  <p role="alert" className="rounded-lg bg-destructive-soft px-3 py-2 text-13 text-destructive-text">
                    {state.error}
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <Button type="button" variant="outline" className="h-11 text-sm" onClick={() => setOffen(false)}>
                    Abbrechen
                  </Button>
                  <Absenden />
                </div>
              </div>
            </form>
          </Card>
        ) : (
          <>
            {gesendet && (
              <p className="flex items-start gap-2 rounded-lg bg-success-soft px-3 py-2.5 text-13 text-success-text">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
                Anfrage gesendet. Sobald dein Fahrlehrer zusagt, steht die Stunde unter „Anstehend“.
              </p>
            )}
            <Button
              type="button"
              className="h-12 w-full text-[15px]"
              disabled={limitErreicht}
              onClick={() => {
                setGesendet(false);
                setOffen(true);
              }}
            >
              <Plus /> Fahrstunde anfragen
            </Button>
            {limitErreicht && (
              <p className="text-center text-xs text-muted-foreground">
                Du hast {regeln?.offen} offene Anfragen – warte bitte auf eine Antwort.
              </p>
            )}
          </>
        ))}

      {anfragen.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Deine Anfragen ({anfragen.length})
          </p>
          <Card className="divide-y overflow-hidden">
            {anfragen.map((a) => (
              <AnfrageZeile key={a.id} a={a} wunsch={a.wunsch_fahrlehrer_id ? namen.get(a.wunsch_fahrlehrer_id) : undefined} />
            ))}
          </Card>
        </div>
      )}
    </section>
  );
}

function AnfrageZeile({ a, wunsch }: { a: FahrstundeAnfrage; wunsch?: string }) {
  const [pending, startTransition] = React.useTransition();
  const [fehler, setFehler] = React.useState<string | null>(null);
  const st = STATUS[a.status];

  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span
        className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          a.status === "angenommen" ? "bg-success-soft text-success" : a.status === "offen" ? "bg-warning-soft text-warning" : "bg-muted text-muted-foreground",
        )}
      >
        <CalendarClock className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">
          {wochentagKurz(a.datum)}., {formatDatum(a.datum).slice(0, 6)} · {formatUhrzeit(a.uhrzeit)} Uhr
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {[`${a.dauer_minuten} Min.`, wunsch && `Wunsch: ${wunsch}`, a.notiz].filter(Boolean).join(" · ")}
        </p>
        {a.antwort && (
          <p className={cn("mt-1 text-xs", a.status === "abgelehnt" ? "text-destructive-text" : "text-foreground-secondary")}>
            {a.status === "abgelehnt" ? `Grund: ${a.antwort}` : a.antwort}
          </p>
        )}
        {fehler && <p className="mt-1 text-xs text-destructive-text">{fehler}</p>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <Badge variant={st.variant}>{st.label}</Badge>
        {a.status === "offen" && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await anfrageZurueckziehen(a.id);
                setFehler(r.error ?? null);
              })
            }
            className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
          >
            {pending ? "…" : "Zurückziehen"}
          </button>
        )}
      </div>
    </div>
  );
}
