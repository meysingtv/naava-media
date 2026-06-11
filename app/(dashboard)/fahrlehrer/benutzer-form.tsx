"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { Check, X } from "lucide-react";

import { benutzerSpeichern, type BenutzerState } from "./actions";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { FUEHRERSCHEINKLASSEN } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Fahrlehrer } from "@/lib/types";

const initial: BenutzerState = {};

const feld =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Abschnitt({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="border-b pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
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

export function BenutzerForm({ benutzer }: { benutzer?: Fahrlehrer }) {
  const [state, action] = useFormState(benutzerSpeichern, initial);
  const [tab, setTab] = useState<"stamm" | "ausbildung">("stamm");
  const [klassen, setKlassen] = useState<string[]>(benutzer?.fuehrerscheinklassen ?? []);

  const titel = benutzer ? `${benutzer.vorname} ${benutzer.nachname}` : "Neuer Benutzer";
  const abbrechenHref = benutzer ? `/fahrlehrer?id=${benutzer.id}` : "/fahrlehrer";

  const tabCls = (aktiv: boolean) =>
    cn(
      "border-b-2 pb-1.5 text-sm font-medium transition-colors",
      aktiv ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
    );

  return (
    <form action={action}>
      {benutzer && <input type="hidden" name="id" value={benutzer.id} />}
      {klassen.map((k) => (
        <input key={k} type="hidden" name="klassen" value={k} />
      ))}

      <div className="rounded-md border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <h1 className="text-sm font-bold tracking-tight">{titel}</h1>
            <div className="flex items-center gap-5">
              <button type="button" onClick={() => setTab("stamm")} className={tabCls(tab === "stamm")}>
                Stammdaten
              </button>
              <button type="button" onClick={() => setTab("ausbildung")} className={tabCls(tab === "ausbildung")}>
                Ausbildung
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button asChild variant="outline" size="sm" type="button">
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
          <Abschnitt title="Person">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <F label="Kürzel">
                <input name="kuerzel" defaultValue={benutzer?.kuerzel ?? undefined} placeholder="z. B. NW" className={feld} />
              </F>
              <F label="Rolle" req>
                <select name="rolle" defaultValue={benutzer?.rolle ?? "fahrlehrer"} className={feld}>
                  <option value="chef">Chef</option>
                  <option value="fahrlehrer">Fahrlehrer</option>
                  <option value="buero">Büro</option>
                </select>
              </F>
              <F label="Vorname" req>
                <input name="vorname" required defaultValue={benutzer?.vorname} className={feld} />
              </F>
              <F label="Name" req>
                <input name="nachname" required defaultValue={benutzer?.nachname} className={feld} />
              </F>
              <F label="Geburtsdatum">
                <input name="geburtsdatum" type="date" defaultValue={benutzer?.geburtsdatum ?? undefined} className={feld} />
              </F>
              <F label="Geburtsort">
                <input name="geburtsort" defaultValue={benutzer?.geburtsort ?? undefined} className={feld} />
              </F>
            </div>
          </Abschnitt>

          <Abschnitt title="Kontakt">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <F label="E-Mail">
                  <input name="email" type="email" defaultValue={benutzer?.email ?? undefined} className={feld} />
                </F>
              </div>
              <F label="Telefon mobil">
                <input name="telefon" type="tel" defaultValue={benutzer?.telefon ?? undefined} className={feld} />
              </F>
              <F label="Telefon privat">
                <input name="telefon_privat" type="tel" defaultValue={benutzer?.telefon_privat ?? undefined} className={feld} />
              </F>
              <div className="sm:col-span-2">
                <F label="Straße &amp; Nr.">
                  <input name="strasse" defaultValue={benutzer?.strasse ?? undefined} className={feld} />
                </F>
              </div>
              <F label="PLZ">
                <input name="plz" inputMode="numeric" defaultValue={benutzer?.plz ?? undefined} className={feld} />
              </F>
              <F label="Ort">
                <input name="ort" defaultValue={benutzer?.ort ?? undefined} className={feld} />
              </F>
            </div>
            {!benutzer && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="einladen" className="h-4 w-4 rounded border-input text-primary focus:ring-ring" />
                Login-Zugang per E-Mail einladen (E-Mail erforderlich)
              </label>
            )}
            <F label="Notiz">
              <textarea name="notiz" rows={3} defaultValue={benutzer?.notiz ?? undefined} className={cn(feld, "h-auto py-2")} />
            </F>
          </Abschnitt>
        </div>

        {/* Ausbildung */}
        <div className={cn("space-y-6 p-4", tab !== "ausbildung" && "hidden")}>
          <Abschnitt title="Führerscheinklassen">
            <p className="text-xs text-muted-foreground">Klassen, die dieser Benutzer als Fahrlehrer ausbildet.</p>
            <div className="flex flex-wrap gap-1.5">
              {FUEHRERSCHEINKLASSEN.map((k) => {
                const aktiv = klassen.includes(k);
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKlassen((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]))}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-sm font-medium transition-colors",
                      aktiv ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background hover:bg-accent",
                    )}
                  >
                    {k}
                  </button>
                );
              })}
            </div>
          </Abschnitt>
        </div>
      </div>
    </form>
  );
}
