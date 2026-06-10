"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { Check, X } from "lucide-react";

import { fahrzeugSpeichern, type FahrzeugState } from "./actions";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { FUEHRERSCHEINKLASSEN } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Fahrzeug } from "@/lib/types";

const initial: FahrzeugState = {};

const feld =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface Option {
  id: string;
  kuerzel: string;
  name: string;
}

function Abschnitt({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="border-b pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

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

function ChipWahl({
  werte,
  ausgewaehlt,
  toggle,
  labelVon,
  titelVon,
}: {
  werte: string[];
  ausgewaehlt: string[];
  toggle: (v: string) => void;
  labelVon?: (v: string) => string;
  titelVon?: (v: string) => string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {werte.map((v) => {
        const aktiv = ausgewaehlt.includes(v);
        return (
          <button
            key={v}
            type="button"
            onClick={() => toggle(v)}
            title={titelVon?.(v)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-sm font-medium transition-colors",
              aktiv
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-background hover:bg-accent",
            )}
          >
            {labelVon ? labelVon(v) : v}
          </button>
        );
      })}
    </div>
  );
}

export function FahrzeugForm({ fahrzeug, options }: { fahrzeug?: Fahrzeug; options: Option[] }) {
  const [state, action] = useFormState(fahrzeugSpeichern, initial);
  const [tab, setTab] = useState<"stamm" | "termine">("stamm");
  const [klassen, setKlassen] = useState<string[]>(
    fahrzeug?.klassen?.length ? fahrzeug.klassen : fahrzeug?.klasse ? [fahrzeug.klasse] : [],
  );
  const [lehrer, setLehrer] = useState<string[]>(fahrzeug?.fahrlehrer_ids ?? []);

  const titel = fahrzeug ? fahrzeug.name || fahrzeug.kennzeichen : "Neues Fahrzeug";
  const abbrechenHref = fahrzeug ? `/fahrzeuge?id=${fahrzeug.id}` : "/fahrzeuge";

  const tabCls = (aktiv: boolean) =>
    cn(
      "border-b-2 pb-1.5 text-sm font-medium transition-colors",
      aktiv
        ? "border-foreground text-foreground"
        : "border-transparent text-muted-foreground hover:text-foreground",
    );

  return (
    <form action={action}>
      {fahrzeug && <input type="hidden" name="id" value={fahrzeug.id} />}
      {klassen.map((k) => (
        <input key={k} type="hidden" name="klassen" value={k} />
      ))}
      {lehrer.map((id) => (
        <input key={id} type="hidden" name="fahrlehrer_ids" value={id} />
      ))}

      <div className="rounded-md border bg-card">
        {/* Kopfleiste */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <h1 className="text-sm font-bold tracking-tight">{titel}</h1>
            <div className="flex items-center gap-5">
              <button type="button" onClick={() => setTab("stamm")} className={tabCls(tab === "stamm")}>
                Stammdaten
              </button>
              <button type="button" onClick={() => setTab("termine")} className={tabCls(tab === "termine")}>
                Termine
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button asChild variant="ghost" size="sm" type="button">
              <a href={abbrechenHref}>
                <X className="h-4 w-4" /> Abbrechen
              </a>
            </Button>
            <SubmitButton size="sm">
              <Check className="h-4 w-4" /> Speichern
            </SubmitButton>
          </div>
        </div>

        {state.error && (
          <div className="border-b px-4 py-2">
            <FormMessage error={state.error} />
          </div>
        )}

        {/* Stammdaten */}
        <div className={cn("space-y-6 p-4", tab !== "stamm" && "hidden")}>
          <Abschnitt title="Fahrzeug">
            {fahrzeug?.nummer != null && (
              <F label="ID">
                <input value={fahrzeug.nummer} readOnly className={cn(feld, "bg-muted text-muted-foreground")} />
              </F>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <F label="Name" req>
                <input name="name" required defaultValue={fahrzeug?.name ?? undefined} className={feld} />
              </F>
              <F label="Kennzeichen" req>
                <input name="kennzeichen" required defaultValue={fahrzeug?.kennzeichen} className={feld} />
              </F>
              <F label="Fahrzeug-ID-Nr.">
                <input
                  name="fahrzeug_id_nr"
                  defaultValue={fahrzeug?.fahrzeug_id_nr ?? undefined}
                  className={feld}
                />
              </F>
              <F label="Getriebeart">
                <select name="getriebeart" defaultValue={fahrzeug?.getriebeart ?? "MANUAL"} className={feld}>
                  <option value="MANUAL">Manuell</option>
                  <option value="AUTOMATIK">Automatik</option>
                </select>
              </F>
            </div>
          </Abschnitt>

          <Abschnitt title="Ausbildungsklassen">
            <ChipWahl
              werte={[...FUEHRERSCHEINKLASSEN]}
              ausgewaehlt={klassen}
              toggle={(v) => setKlassen((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]))}
            />
          </Abschnitt>

          <Abschnitt title="Fahrlehrer">
            {options.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine aktiven Fahrlehrer vorhanden.</p>
            ) : (
              <ChipWahl
                werte={options.map((o) => o.id)}
                ausgewaehlt={lehrer}
                toggle={(v) => setLehrer((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]))}
                labelVon={(id) => options.find((o) => o.id === id)?.kuerzel ?? "?"}
                titelVon={(id) => options.find((o) => o.id === id)?.name ?? ""}
              />
            )}
          </Abschnitt>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="anhaenger"
              defaultChecked={fahrzeug?.anhaenger}
              className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
            />
            Anhänger
          </label>
        </div>

        {/* Termine */}
        <div className={cn("space-y-6 p-4", tab !== "termine" && "hidden")}>
          <Abschnitt title="Saisonale Sperrung">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <F label="Von">
                <input name="saison_von" type="date" defaultValue={fahrzeug?.saison_von ?? undefined} className={feld} />
              </F>
              <F label="Bis">
                <input name="saison_bis" type="date" defaultValue={fahrzeug?.saison_bis ?? undefined} className={feld} />
              </F>
            </div>
          </Abschnitt>

          <Abschnitt title="Hauptuntersuchung">
            <F label="Nächste HU / TÜV">
              <input
                name="hauptuntersuchung"
                type="date"
                defaultValue={fahrzeug?.hauptuntersuchung ?? undefined}
                className={cn(feld, "max-w-xs")}
              />
            </F>
          </Abschnitt>
        </div>
      </div>
    </form>
  );
}
