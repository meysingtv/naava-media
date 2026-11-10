"use client";

import { useState } from "react";
import Link from "next/link";
import { useFormState } from "react-dom";

import { rolleSpeichern, type RolleState } from "../rollen-actions";
import { Auswahl } from "@/components/ui/auswahl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { SIDEBAR_BEREICHE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Benutzerrolle, RolleRecht } from "@/lib/types";

const initial: RolleState = {};
const ZUGANGSARTEN = ["Verwaltung", "Fahrlehrer", "Büro", "Eingeschränkt"];

/** Eigene Rolle anlegen oder bearbeiten – Name, Zugang und Bereiche. */
export function RolleEditor({ rolle }: { rolle?: Benutzerrolle }) {
  const [state, action] = useFormState(rolleSpeichern, initial);
  const [reiter, setReiter] = useState<"allgemein" | "bereiche">("allgemein");
  const [webZugang, setWebZugang] = useState(rolle?.web_zugang ?? true);
  const [zugangsart, setZugangsart] = useState(rolle?.zugangsart ?? "");
  const [sidebar, setSidebar] = useState<Record<string, RolleRecht>>(() => (rolle?.rechte?.sidebar as Record<string, RolleRecht>) ?? {});

  const zugangsarten = zugangsart && !ZUGANGSARTEN.includes(zugangsart) ? [...ZUGANGSARTEN, zugangsart] : ZUGANGSARTEN;
  const zurueck = rolle ? `/fahrlehrer/rollen?rolle=${rolle.id}` : "/fahrlehrer/rollen";

  function setRecht(key: string, art: "ansehen" | "bearbeiten", wert: boolean) {
    setSidebar((prev) => {
      const aktuell = { ...(prev[key] ?? {}) };
      aktuell[art] = wert;
      if (art === "bearbeiten" && wert) aktuell.ansehen = true;
      if (art === "ansehen" && !wert) aktuell.bearbeiten = false;
      return { ...prev, [key]: aktuell };
    });
  }

  return (
    <form action={action} className="overflow-hidden rounded-xl bg-card shadow-panel">
      {rolle && <input type="hidden" name="id" value={rolle.id} />}
      <input type="hidden" name="web_zugang" value={String(webZugang)} />
      <input type="hidden" name="rechte" value={JSON.stringify({ sidebar })} />
      <input type="hidden" name="zugangsart" value={zugangsart} />

      <header className="border-b border-border px-5 pt-4">
        <h2 className="text-[15px] font-semibold text-foreground">{rolle ? `${rolle.name} bearbeiten` : "Neue Rolle"}</h2>
        <div role="tablist" className="mt-3 flex gap-5">
          {(
            [
              ["allgemein", "Allgemein"],
              ["bereiche", "Bereiche"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={reiter === key}
              onClick={() => setReiter(key)}
              className={cn(
                "-mb-px border-b-2 pb-2.5 text-13 font-medium transition-colors",
                reiter === key ? "border-foreground text-foreground" : "border-transparent text-foreground-secondary hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="px-5 py-5">
        {state.error && (
          <div className="mb-5">
            <FormMessage error={state.error} />
          </div>
        )}

        <div className={cn("space-y-5", reiter !== "allgemein" && "hidden")}>
          <Field label="Name der Rolle" required>
            <Input name="name" required defaultValue={rolle?.name ?? ""} placeholder="z. B. Büro Teilzeit" />
          </Field>
          <Field label="Beschreibung">
            <Input name="beschreibung" defaultValue={rolle?.beschreibung ?? undefined} placeholder="Wofür ist die Rolle gedacht?" />
          </Field>
          <Field label="Zugangsart">
            <Auswahl
              optionen={zugangsarten.map((z) => ({ value: z, label: z }))}
              value={zugangsart}
              onChange={setZugangsart}
              leerLabel="Keine Angabe"
              placeholder="Keine Angabe"
            />
          </Field>
          <div className="flex items-center justify-between gap-4 rounded-lg bg-surface-muted/60 px-4 py-3">
            <div className="min-w-0">
              <p className="text-13 font-medium text-foreground">Anmeldung im Browser</p>
              <p className="text-xs text-foreground-secondary">Aus: Die Person meldet sich nur über die App an.</p>
            </div>
            <Switch checked={webZugang} onCheckedChange={setWebZugang} aria-label="Anmeldung im Browser" />
          </div>
        </div>

        <div className={cn(reiter !== "bereiche" && "hidden")}>
          <div className="grid grid-cols-[minmax(0,1fr)_72px_88px] items-center gap-2 border-b border-border pb-2 text-xs font-medium text-foreground-secondary">
            <span>Bereich</span>
            <span className="text-center">Ansehen</span>
            <span className="text-center">Bearbeiten</span>
          </div>
          <ul className="divide-y divide-border">
            {SIDEBAR_BEREICHE.map((b) => {
              const recht = sidebar[b.key] ?? {};
              return (
                <li key={b.key} className="grid grid-cols-[minmax(0,1fr)_72px_88px] items-center gap-2 py-2.5">
                  <span className="min-w-0">
                    <span className="block text-13 font-medium text-foreground">{b.label}</span>
                    <span className="block truncate text-xs text-foreground-secondary">{b.beschreibung}</span>
                  </span>
                  <span className="flex justify-center">
                    <Switch checked={Boolean(recht.ansehen)} onCheckedChange={(v) => setRecht(b.key, "ansehen", v)} aria-label={`${b.label} ansehen`} />
                  </span>
                  <span className="flex justify-center">
                    <Switch
                      checked={Boolean(recht.bearbeiten)}
                      onCheckedChange={(v) => setRecht(b.key, "bearbeiten", v)}
                      aria-label={`${b.label} bearbeiten`}
                    />
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-foreground-tertiary">Bearbeiten schließt Ansehen mit ein.</p>
        </div>
      </div>

      <footer className="flex items-center justify-end gap-2 border-t border-border bg-surface-muted/40 px-5 py-3">
        <Button asChild variant="outline" size="sm">
          <Link href={zurueck}>Abbrechen</Link>
        </Button>
        <SubmitButton size="sm">{rolle ? "Änderungen speichern" : "Rolle anlegen"}</SubmitButton>
      </footer>
    </form>
  );
}
