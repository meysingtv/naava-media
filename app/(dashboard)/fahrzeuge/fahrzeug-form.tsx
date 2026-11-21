"use client";

import { useState } from "react";
import { useFormState } from "react-dom";

import { fahrzeugSpeichern, type FahrzeugState } from "./actions";
import { Auswahl } from "@/components/ui/auswahl";
import { DatumFeld } from "@/components/ui/datum-feld";
import { Field } from "@/components/ui/field";
import { Ankreuzfeld, FeldGitter, FormularAbschnitt, Speicherleiste } from "@/components/ui/formular";
import { Input } from "@/components/ui/input";
import { DetailKopf } from "@/components/shared/detail-kopf";
import { FormMessage } from "@/components/shared/form-message";
import { KlassenAuswahl } from "@/components/shared/klassen-auswahl";
import { getriebeWert } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Fahrzeug } from "@/lib/types";

const initial: FahrzeugState = {};

const GETRIEBE = [
  { value: "MANUAL", label: "Schaltung" },
  { value: "AUTOMATIK", label: "Automatik" },
];

interface Option {
  id: string;
  kuerzel: string;
  name: string;
}

/** Fahrzeug anlegen oder bearbeiten – Stammdaten, Einsatz, Termine. */
export function FahrzeugForm({ fahrzeug, options }: { fahrzeug?: Fahrzeug; options: Option[] }) {
  const [state, action] = useFormState(fahrzeugSpeichern, initial);
  const [lehrer, setLehrer] = useState<string[]>(fahrzeug?.fahrlehrer_ids ?? []);

  const name = fahrzeug ? fahrzeug.name || fahrzeug.kennzeichen : null;
  const zurueck = fahrzeug ? `/fahrzeuge/${fahrzeug.id}` : "/fahrzeuge";
  const klassen = fahrzeug?.klassen?.length ? fahrzeug.klassen : fahrzeug?.klasse ? [fahrzeug.klasse] : [];

  return (
    <form action={action}>
      {fahrzeug && <input type="hidden" name="id" value={fahrzeug.id} />}
      {lehrer.map((id) => (
        <input key={id} type="hidden" name="fahrlehrer_ids" value={id} />
      ))}

      <DetailKopf
        zurueck={{ href: zurueck, label: name ?? "Fahrzeuge" }}
        titel={name ? `${name} bearbeiten` : "Fahrzeug anlegen"}
        kurztitel={name ? `${fahrzeug?.kennzeichen ?? name} bearbeiten` : "Neues Fahrzeug"}
        meta={[fahrzeug?.nummer != null ? `Fahrzeug-Nr. ${fahrzeug.nummer}` : "Pflichtfelder sind mit * markiert"]}
      />

      {state.error && (
        <div className="mb-6">
          <FormMessage error={state.error} />
        </div>
      )}

      <div className="space-y-8">
        <FormularAbschnitt titel="Fahrzeug" beschreibung="Name, Kennzeichen und Getriebe, wie sie im Kalender erscheinen.">
          <FeldGitter>
            <Field label="Name" required hint="z. B. „Golf 8 Schalter“">
              <Input name="name" required defaultValue={fahrzeug?.name ?? undefined} />
            </Field>
            <Field label="Kennzeichen" required>
              <Input name="kennzeichen" required defaultValue={fahrzeug?.kennzeichen} className="uppercase" />
            </Field>
            <Field label="Getriebe">
              <Auswahl name="getriebeart" optionen={GETRIEBE} defaultValue={getriebeWert(fahrzeug?.getriebeart)} />
            </Field>
            <Field label="Fahrzeug-Identnummer">
              <Input name="fahrzeug_id_nr" defaultValue={fahrzeug?.fahrzeug_id_nr ?? undefined} />
            </Field>
          </FeldGitter>
          <div className="mt-5 border-t border-border pt-5">
            <Ankreuzfeld name="anhaenger" label="Anhänger" hinweis="Für die Ausbildung in BE und CE" defaultChecked={fahrzeug?.anhaenger} />
          </div>
        </FormularAbschnitt>

        <FormularAbschnitt titel="Einsatz" beschreibung="Für welche Klassen und von welchen Fahrlehrern das Fahrzeug genutzt wird.">
          <KlassenAuswahl defaultValue={klassen} label="Ausbildungsklassen" />
          <div className="mt-5 border-t border-border pt-5">
            <p className="mb-1.5 text-13 font-medium text-foreground">Fahrlehrer</p>
            {options.length === 0 ? (
              <p className="text-13 text-foreground-secondary">Keine aktiven Fahrlehrer vorhanden.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Fahrlehrer">
                {options.map((o) => {
                  const aktiv = lehrer.includes(o.id);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      aria-pressed={aktiv}
                      onClick={() => setLehrer((p) => (p.includes(o.id) ? p.filter((x) => x !== o.id) : [...p, o.id]))}
                      className={cn(
                        "inline-flex h-8 items-center gap-2 rounded-md border px-2.5 text-13 font-medium transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
                        aktiv
                          ? "border-primary bg-primary-soft text-primary-text"
                          : "border-border-strong bg-card text-foreground-secondary hover:bg-surface-muted hover:text-foreground",
                      )}
                    >
                      <span className="text-xs font-semibold opacity-70">{o.kuerzel}</span>
                      {o.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </FormularAbschnitt>

        <FormularAbschnitt titel="Termine" beschreibung="Hauptuntersuchung, Wartung und eine mögliche Saisonpause.">
          <FeldGitter>
            <Field label="Nächste Hauptuntersuchung">
              <DatumFeld name="hauptuntersuchung" defaultValue={fahrzeug?.hauptuntersuchung} />
            </Field>
            <Field label="Nächste Wartung">
              <DatumFeld name="naechste_wartung" defaultValue={fahrzeug?.naechste_wartung} />
            </Field>
            <Field label="Nicht verfügbar ab" hint="Saisonpause, z. B. für Motorräder">
              <DatumFeld name="saison_von" defaultValue={fahrzeug?.saison_von} />
            </Field>
            <Field label="Wieder verfügbar ab">
              <DatumFeld name="saison_bis" defaultValue={fahrzeug?.saison_bis} />
            </Field>
          </FeldGitter>
        </FormularAbschnitt>

        <FormularAbschnitt titel="Versicherung und Kilometer">
          <FeldGitter>
            <Field label="Versicherung">
              <Input name="versicherung" defaultValue={fahrzeug?.versicherung ?? undefined} placeholder="z. B. HUK-Coburg, Police 123" />
            </Field>
            <Field label="Kilometerstand">
              <Input name="km_stand" type="number" min={0} defaultValue={fahrzeug?.km_stand ?? undefined} trailing="km" />
            </Field>
          </FeldGitter>
        </FormularAbschnitt>
      </div>

      <Speicherleiste
        abbrechenHref={zurueck}
        speichernLabel={fahrzeug ? "Änderungen speichern" : "Fahrzeug anlegen"}
        hinweis="Pflichtfelder sind mit * markiert"
      />
    </form>
  );
}
