"use client";

import { useFormState } from "react-dom";

import { schuelerSpeichern, type SchuelerFormState } from "./actions";
import { Auswahl } from "@/components/ui/auswahl";
import { DatumFeld } from "@/components/ui/datum-feld";
import { Field } from "@/components/ui/field";
import { Ankreuzfeld, FeldGitter, FormularAbschnitt, Speicherleiste } from "@/components/ui/formular";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DetailKopf } from "@/components/shared/detail-kopf";
import { FormMessage } from "@/components/shared/form-message";
import { KlassenAuswahl } from "@/components/shared/klassen-auswahl";
import { FUEHRERSCHEINKLASSEN } from "@/lib/constants";
import type { Fahrschueler } from "@/lib/types";

const initial: SchuelerFormState = {};

const ANREDEN = ["Herr", "Frau", "Divers"].map((a) => ({ value: a, label: a }));
const ERTEILUNGSARTEN = ["Ersterteilung", "Erweiterung"].map((a) => ({ value: a, label: a }));
const ZAHLUNGSARTEN = ["Bar", "SEPA-Lastschrift", "Überweisung", "ClassicPay"].map((a) => ({ value: a, label: a }));
const KLASSEN = FUEHRERSCHEINKLASSEN.map((k) => ({ value: k, label: k }));

/**
 * Schüler anlegen und bearbeiten – ein Formular mit klaren Abschnitten statt
 * Reitern. Zahlungsangaben erscheinen nur für Rollen mit Zugriff auf
 * Rechnungen; die Server-Aktion lässt sie sonst unverändert.
 */
export function SchuelerForm({ schueler, zeigeFinanzen = true }: { schueler?: Fahrschueler; zeigeFinanzen?: boolean }) {
  const [state, action] = useFormState(schuelerSpeichern, initial);
  const name = schueler ? `${schueler.vorname} ${schueler.nachname}` : null;
  const zurueck = schueler ? `/schueler/${schueler.id}` : "/schueler";
  const heute = new Date().toISOString().slice(0, 10);

  return (
    <form action={action}>
      {schueler && <input type="hidden" name="id" value={schueler.id} />}

      <DetailKopf
        zurueck={{ href: zurueck, label: name ?? "Schüler" }}
        titel={schueler ? `${name} bearbeiten` : "Neuen Schüler anlegen"}
        kurztitel={name ? `${name} bearbeiten` : "Neuer Schüler"}
        meta={[schueler?.kundennummer != null ? `Kd.-Nr. ${schueler.kundennummer}` : "Pflichtfelder sind mit * markiert"]}
      />

      {state.error && (
        <div className="mb-6">
          <FormMessage error={state.error} />
        </div>
      )}

      <div className="space-y-8">
        <FormularAbschnitt titel="Person" beschreibung="Name und Geburtsdaten, wie sie im Ausweis stehen.">
          <FeldGitter>
            <Field label="Anrede">
              <Auswahl name="anrede" optionen={ANREDEN} defaultValue={schueler?.anrede} leerLabel="Keine Angabe" placeholder="Keine Angabe" />
            </Field>
            <div className="hidden sm:block" />
            <Field label="Vorname" required>
              <Input name="vorname" required defaultValue={schueler?.vorname} autoComplete="off" />
            </Field>
            <Field label="Nachname" required>
              <Input name="nachname" required defaultValue={schueler?.nachname} autoComplete="off" />
            </Field>
            <Field label="Geburtsdatum">
              <DatumFeld name="geburtsdatum" defaultValue={schueler?.geburtsdatum} />
            </Field>
            <Field label="Geburtsort">
              <Input name="geburtsort" defaultValue={schueler?.geburtsort ?? undefined} />
            </Field>
            <Field label="Staatsangehörigkeit" className="sm:col-span-2">
              <Input name="staatsangehoerigkeit" defaultValue={schueler?.staatsangehoerigkeit ?? "Deutschland"} />
            </Field>
          </FeldGitter>
        </FormularAbschnitt>

        <FormularAbschnitt titel="Kontakt" beschreibung="Adresse und Wege, auf denen der Schüler erreichbar ist.">
          <FeldGitter>
            <Field label="Straße und Hausnummer" className="sm:col-span-2">
              <Input name="strasse" defaultValue={schueler?.strasse ?? undefined} autoComplete="street-address" />
            </Field>
            <Field label="PLZ">
              <Input name="plz" inputMode="numeric" defaultValue={schueler?.plz ?? undefined} autoComplete="postal-code" />
            </Field>
            <Field label="Ort">
              <Input name="ort" defaultValue={schueler?.ort ?? undefined} autoComplete="address-level2" />
            </Field>
            <Field label="Mobil" hint="Für Terminerinnerungen per SMS">
              <Input name="telefon" type="tel" defaultValue={schueler?.telefon ?? undefined} />
            </Field>
            <Field label="E-Mail">
              <Input name="email" type="email" defaultValue={schueler?.email ?? undefined} />
            </Field>
            <Field label="Telefon privat">
              <Input name="telefon_privat" type="tel" defaultValue={schueler?.telefon_privat ?? undefined} />
            </Field>
            <Field label="Telefon beruflich">
              <Input name="telefon_beruflich" type="tel" defaultValue={schueler?.telefon_beruflich ?? undefined} />
            </Field>
          </FeldGitter>
        </FormularAbschnitt>

        <FormularAbschnitt titel="Ausbildung" beschreibung="Klassen, bisheriger Führerschein und Beginn der Ausbildung.">
          <div className="mb-5">
            <KlassenAuswahl defaultValue={schueler?.fuehrerscheinklassen} />
          </div>
          <FeldGitter>
            <Field label="Anmeldedatum" required>
              <DatumFeld name="anmeldedatum" required defaultValue={schueler?.anmeldedatum ?? heute} />
            </Field>
            <Field label="Kurs">
              <Input name="kurs" defaultValue={schueler?.kurs ?? undefined} />
            </Field>
            <Field label="Erteilungsart">
              <Auswahl name="erteilungsart" optionen={ERTEILUNGSARTEN} defaultValue={schueler?.erteilungsart} leerLabel="Keine Angabe" placeholder="Keine Angabe" />
            </Field>
            <Field label="Schlüsselzahl">
              <Input name="schluesselzahl" defaultValue={schueler?.schluesselzahl ?? undefined} />
            </Field>
            <Field label="Bisherige Klasse">
              <Auswahl name="bisherige_klasse" optionen={KLASSEN} defaultValue={schueler?.bisherige_klasse} leerLabel="Keine" placeholder="Keine" />
            </Field>
            <Field label="Ausgestellt am">
              <DatumFeld name="ausgabedatum" defaultValue={schueler?.ausgabedatum} />
            </Field>
            <Field label="Führerscheinnummer" className="sm:col-span-2">
              <Input name="fuehrerscheinnummer" defaultValue={schueler?.fuehrerscheinnummer ?? undefined} />
            </Field>
          </FeldGitter>
          <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5">
            <Ankreuzfeld name="bf17" label="Begleitetes Fahren ab 17" defaultChecked={schueler?.bf17} />
          </div>
        </FormularAbschnitt>

        <FormularAbschnitt titel="Prüfungen" beschreibung="Termine und Versuche für Theorie und Praxis.">
          <FeldGitter>
            <Field label="Theorieprüfung am">
              <DatumFeld name="theorie_termin" defaultValue={schueler?.theorie_termin} />
            </Field>
            <Field label="Versuch Theorie">
              <Input name="theorie_versuch" type="number" min="1" defaultValue={schueler?.theorie_versuch ?? 1} />
            </Field>
            <Field label="Praktische Prüfung am">
              <DatumFeld name="pruefung_termin" defaultValue={schueler?.pruefung_termin} />
            </Field>
            <Field label="Versuch Praxis">
              <Input name="praxis_versuch" type="number" min="1" defaultValue={schueler?.praxis_versuch ?? 1} />
            </Field>
          </FeldGitter>
          <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5">
            <Ankreuzfeld name="theorie_bestanden" label="Theorieprüfung bestanden" defaultChecked={schueler?.theorie_bestanden} />
            <Ankreuzfeld
              name="ausbildung_beendet"
              label="Ausbildung abgeschlossen"
              hinweis="Der Schüler erscheint dann unter „Abgeschlossen“."
              defaultChecked={schueler?.ausbildung_beendet}
            />
          </div>
        </FormularAbschnitt>

        <FormularAbschnitt titel="Unterlagen" beschreibung="Was für den Antrag bei der Führerscheinstelle vorliegt.">
          <FeldGitter>
            <Field label="Sehtest am">
              <DatumFeld name="sehtest_am" defaultValue={schueler?.sehtest_am} />
            </Field>
            <Field label="Erste-Hilfe-Kurs am">
              <DatumFeld name="erste_hilfe_am" defaultValue={schueler?.erste_hilfe_am} />
            </Field>
            <Field label="Antrag gestellt am">
              <DatumFeld name="antrag_gestellt_am" defaultValue={schueler?.antrag_gestellt_am} />
            </Field>
          </FeldGitter>
          <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5">
            <Ankreuzfeld name="passbild_ok" label="Passbild liegt vor" defaultChecked={schueler?.passbild_ok} />
            <Ankreuzfeld name="ausweis_ok" label="Ausweiskopie liegt vor" defaultChecked={schueler?.ausweis_ok} />
            <Ankreuzfeld name="sehhilfe" label="Sehhilfe erforderlich" defaultChecked={schueler?.sehhilfe} />
          </div>
        </FormularAbschnitt>

        {zeigeFinanzen && (
          <FormularAbschnitt titel="Zahlung" beschreibung="Preisliste, Bankverbindung und ein möglicher Kostenträger.">
            <FeldGitter>
              <Field label="Preisliste">
                <Input name="preisliste" defaultValue={schueler?.preisliste ?? undefined} />
              </Field>
              <Field label="Zahlungsart">
                <Auswahl name="zahlungsart" optionen={ZAHLUNGSARTEN} defaultValue={schueler?.zahlungsart} leerLabel="Keine Angabe" placeholder="Keine Angabe" />
              </Field>
              <Field label="IBAN" className="sm:col-span-2">
                <Input name="iban" defaultValue={schueler?.iban ?? undefined} placeholder="DE00 0000 0000 0000 0000 00" />
              </Field>
              <Field label="SEPA-Mandatsreferenz">
                <Input name="sepa_mandat_ref" defaultValue={schueler?.sepa_mandat_ref ?? undefined} placeholder="z. B. M-2026-0001" />
              </Field>
              <Field label="Mandat erteilt am">
                <DatumFeld name="sepa_mandat_am" defaultValue={schueler?.sepa_mandat_am} />
              </Field>
              <Field label="Kostenträger">
                <Input name="kostentraeger" defaultValue={schueler?.kostentraeger ?? undefined} placeholder="z. B. Agentur für Arbeit" />
              </Field>
              <Field label="E-Mail des Kostenträgers">
                <Input name="kostentraeger_email" type="email" defaultValue={schueler?.kostentraeger_email ?? undefined} />
              </Field>
              <Field label="Vorgangsnummer" className="sm:col-span-2">
                <Input name="vorgangsnummer" defaultValue={schueler?.vorgangsnummer ?? undefined} />
              </Field>
            </FeldGitter>
            <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5">
              <Ankreuzfeld name="intensivkurs" label="Intensivkurs" defaultChecked={schueler?.intensivkurs} />
              <Ankreuzfeld name="zweiter_preis" label="Zweiter Preis" defaultChecked={schueler?.zweiter_preis} />
              <Ankreuzfeld
                name="autom_leistungspakete"
                label="Leistungspakete automatisch berechnen"
                defaultChecked={schueler?.autom_leistungspakete}
              />
            </div>
          </FormularAbschnitt>
        )}

        <FormularAbschnitt titel="Weitere Angaben" beschreibung="Filiale, Prüfstelle, Lernstand und interne Notizen.">
          <FeldGitter>
            <Field label="Filiale">
              <Input name="filiale" defaultValue={schueler?.filiale ?? undefined} />
            </Field>
            <Field label="Prüfort">
              <Input name="pruefort" defaultValue={schueler?.pruefort ?? undefined} />
            </Field>
            <Field label="Prüforganisation">
              <Input name="prueforganisation" defaultValue={schueler?.prueforganisation ?? undefined} placeholder="z. B. TÜV Süd" />
            </Field>
            <Field label="Lernstand Theorie-App" hint="In Prozent, 0 bis 100">
              <Input name="lernstatus" type="number" min="0" max="100" defaultValue={schueler?.lernstatus ?? 0} trailing="%" />
            </Field>
            <Field label="Notizen" className="sm:col-span-2">
              <Textarea name="notizen" rows={4} defaultValue={schueler?.notizen ?? undefined} placeholder="Nur intern sichtbar" />
            </Field>
          </FeldGitter>
        </FormularAbschnitt>
      </div>

      <Speicherleiste
        abbrechenHref={zurueck}
        speichernLabel={schueler ? "Änderungen speichern" : "Schüler anlegen"}
        hinweis="Pflichtfelder sind mit * markiert"
      />
    </form>
  );
}
