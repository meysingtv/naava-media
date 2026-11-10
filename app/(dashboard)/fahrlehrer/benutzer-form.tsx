"use client";

import { useFormState } from "react-dom";
import { Lock } from "lucide-react";

import { benutzerSpeichern, type BenutzerState } from "./actions";
import { Auswahl } from "@/components/ui/auswahl";
import { DatumFeld } from "@/components/ui/datum-feld";
import { Field } from "@/components/ui/field";
import { Ankreuzfeld, FeldGitter, FormularAbschnitt, Speicherleiste } from "@/components/ui/formular";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DetailKopf } from "@/components/shared/detail-kopf";
import { FormMessage } from "@/components/shared/form-message";
import { KlassenAuswahl } from "@/components/shared/klassen-auswahl";
import { ROLLEN } from "@/lib/constants";
import type { Benutzerrolle, Fahrlehrer } from "@/lib/types";

const initial: BenutzerState = {};

const STANDARD_ROLLEN = [
  { value: "chef", label: "Geschäftsführer" },
  { value: "fahrlehrer", label: "Fahrlehrer" },
  { value: "buero", label: "Büro" },
];

/** Mitarbeiter anlegen oder bearbeiten – Person, Kontakt, Zugang, Ausbildung. */
export function BenutzerForm({
  benutzer,
  istSelbst = false,
  rollen = [],
}: {
  benutzer?: Fahrlehrer;
  istSelbst?: boolean;
  rollen?: Benutzerrolle[];
}) {
  const [state, action] = useFormState(benutzerSpeichern, initial);

  const istBearbeiten = Boolean(benutzer);
  const hatLogin = Boolean(benutzer?.user_id);
  const name = benutzer ? `${benutzer.vorname} ${benutzer.nachname}` : null;
  const zurueck = benutzer ? `/fahrlehrer/${benutzer.id}` : "/fahrlehrer";

  // Einheitliche Rolle: eigene Rolle (UUID) hat Vorrang, sonst Standard-Rolle.
  const rolleDefault = benutzer?.benutzerrolle_id ?? benutzer?.rolle ?? "fahrlehrer";
  const aktuelleRolleName = benutzer?.benutzerrolle_id
    ? rollen.find((r) => r.id === benutzer.benutzerrolle_id)?.name ?? "—"
    : benutzer
      ? ROLLEN[benutzer.rolle]
      : "";

  return (
    <form action={action}>
      {benutzer && <input type="hidden" name="id" value={benutzer.id} />}

      <DetailKopf
        zurueck={{ href: zurueck, label: name ?? "Team" }}
        titel={name ? `${name} bearbeiten` : "Mitarbeiter anlegen"}
        kurztitel={name ? `${name} bearbeiten` : "Neuer Mitarbeiter"}
        meta={[benutzer ? aktuelleRolleName : "Pflichtfelder sind mit * markiert"]}
      />

      {state.error && (
        <div className="mb-6">
          <FormMessage error={state.error} />
        </div>
      )}

      <div className="space-y-8">
        <FormularAbschnitt titel="Person und Rolle" beschreibung="Die Rolle bestimmt, welche Bereiche der Mitarbeiter sieht.">
          <FeldGitter>
            <Field label="Vorname" required>
              <Input name="vorname" required defaultValue={benutzer?.vorname} autoComplete="off" />
            </Field>
            <Field label="Nachname" required>
              <Input name="nachname" required defaultValue={benutzer?.nachname} autoComplete="off" />
            </Field>
            <Field label="Rolle" required hint={istSelbst ? "Die eigene Rolle lässt sich nicht ändern." : undefined}>
              {istSelbst ? (
                <div className="flex h-9 items-center gap-2 rounded-md border border-input bg-surface-muted px-3 text-sm text-foreground-secondary">
                  <Lock className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" /> {aktuelleRolleName}
                </div>
              ) : (
                <Auswahl
                  name="rolle_wahl"
                  optionen={[]}
                  gruppen={[
                    { label: "Standard", optionen: STANDARD_ROLLEN },
                    { label: "Eigene Rollen", optionen: rollen.map((r) => ({ value: r.id, label: r.name })) },
                  ]}
                  defaultValue={rolleDefault}
                />
              )}
            </Field>
            <Field label="Kürzel" hint="Erscheint im Kalender und in Listen">
              <Input name="kuerzel" defaultValue={benutzer?.kuerzel ?? undefined} placeholder="z. B. NW" />
            </Field>
            <Field label="Geburtsdatum">
              <DatumFeld name="geburtsdatum" defaultValue={benutzer?.geburtsdatum} />
            </Field>
            <Field label="Geburtsort">
              <Input name="geburtsort" defaultValue={benutzer?.geburtsort ?? undefined} />
            </Field>
          </FeldGitter>
        </FormularAbschnitt>

        <FormularAbschnitt titel="Kontakt" beschreibung="Adresse und Telefon für Rückfragen und Dienstpläne.">
          <FeldGitter>
            <Field label="E-Mail" className="sm:col-span-2">
              <Input name="email" type="email" defaultValue={benutzer?.email ?? undefined} />
            </Field>
            <Field label="Telefon mobil">
              <Input name="telefon" type="tel" defaultValue={benutzer?.telefon ?? undefined} />
            </Field>
            <Field label="Telefon privat">
              <Input name="telefon_privat" type="tel" defaultValue={benutzer?.telefon_privat ?? undefined} />
            </Field>
            <Field label="Straße und Hausnummer" className="sm:col-span-2">
              <Input name="strasse" defaultValue={benutzer?.strasse ?? undefined} />
            </Field>
            <Field label="PLZ">
              <Input name="plz" inputMode="numeric" defaultValue={benutzer?.plz ?? undefined} />
            </Field>
            <Field label="Ort">
              <Input name="ort" defaultValue={benutzer?.ort ?? undefined} />
            </Field>
            <Field label="Notiz" className="sm:col-span-2">
              <Textarea name="notiz" rows={3} defaultValue={benutzer?.notiz ?? undefined} placeholder="Nur intern sichtbar" />
            </Field>
          </FeldGitter>
        </FormularAbschnitt>

        <FormularAbschnitt
          titel="Zugang"
          beschreibung={
            istBearbeiten
              ? hatLogin
                ? "Neues Passwort nur eintragen, wenn es geändert werden soll."
                : "Noch kein Zugang – mit E-Mail und Passwort aktivieren."
              : "Passwort vergeben oder eine Einladung per E-Mail schicken."
          }
        >
          <FeldGitter>
            <Field label={istBearbeiten ? "Neues Passwort" : "Passwort"} hint="Mindestens 6 Zeichen">
              <Input name="passwort" type="password" minLength={6} autoComplete="new-password" />
            </Field>
          </FeldGitter>
          {!istBearbeiten && (
            <div className="mt-5 border-t border-border pt-5">
              <Ankreuzfeld
                name="einladen"
                label="Stattdessen per E-Mail einladen"
                hinweis="Der Mitarbeiter setzt sein Passwort dann selbst."
              />
            </div>
          )}
        </FormularAbschnitt>

        <FormularAbschnitt titel="Ausbildung" beschreibung="Klassen, die der Mitarbeiter als Fahrlehrer ausbildet.">
          <KlassenAuswahl defaultValue={benutzer?.fuehrerscheinklassen} />
        </FormularAbschnitt>
      </div>

      <Speicherleiste
        abbrechenHref={zurueck}
        speichernLabel={istBearbeiten ? "Änderungen speichern" : "Mitarbeiter anlegen"}
        hinweis="Pflichtfelder sind mit * markiert"
      />
    </form>
  );
}
