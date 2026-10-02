"use client";

import { Auswahl } from "@/components/ui/auswahl";
import { DatumFeld } from "@/components/ui/datum-feld";
import { Field } from "@/components/ui/field";
import { FeldGitter } from "@/components/ui/formular";
import { Input } from "@/components/ui/input";
import { ZeitFeld } from "@/components/ui/zeit-feld";
import { FormularDialog } from "@/components/shared/formular-dialog";
import { pruefungErstellen } from "./actions";

const ARTEN = [
  { value: "theorie", label: "Theorieprüfung" },
  { value: "praxis", label: "Praktische Prüfung" },
];

const PRUEFSTELLEN = ["TÜV Nord", "TÜV Süd", "TÜV Hessen", "TÜV Rheinland", "DEKRA"];

export function PruefungNeu({
  schueler,
  klassen,
}: {
  schueler: { id: string; label: string; klasse: string }[];
  klassen: string[];
}) {
  const heute = new Date().toISOString().slice(0, 10);

  return (
    <FormularDialog
      action={pruefungErstellen}
      ausloeser="Prüfung anlegen"
      titel="Prüfung anlegen"
      beschreibung="Theorie- oder Praxisprüfung mit Termin und Prüfstelle eintragen."
      erfolg="Prüfung eingetragen"
    >
      <FeldGitter>
        <Field label="Art">
          <Auswahl name="art" optionen={ARTEN} defaultValue="theorie" />
        </Field>
        <Field label="Klasse">
          <Auswahl name="klasse" optionen={klassen.map((k) => ({ value: k, label: k }))} leerLabel="Keine Angabe" placeholder="Keine Angabe" />
        </Field>
        <Field label="Schüler" className="sm:col-span-2">
          <Auswahl
            name="schueler_id"
            optionen={schueler.map((s) => ({ value: s.id, label: s.label }))}
            leerLabel="Kein Schüler"
            placeholder="Schüler wählen"
          />
        </Field>
        <Field label="Datum" required>
          <DatumFeld name="datum" required defaultValue={heute} />
        </Field>
        <Field label="Uhrzeit">
          <ZeitFeld name="uhrzeit" defaultValue="08:00" />
        </Field>
        <Field label="Prüfstelle" className="sm:col-span-2">
          <Auswahl name="pruefstelle" optionen={PRUEFSTELLEN.map((p) => ({ value: p, label: p }))} leerLabel="Keine Angabe" placeholder="Keine Angabe" />
        </Field>
        <Field label="Versuch">
          <Input name="versuch" type="number" min={1} defaultValue={1} />
        </Field>
        <Field label="Gebühr">
          <Input name="gebuehr" type="number" step="0.01" min={0} placeholder="z. B. 22,90" trailing="€" />
        </Field>
        <Field label="Notiz" className="sm:col-span-2">
          <Input name="notiz" placeholder="Optional" />
        </Field>
      </FeldGitter>
    </FormularDialog>
  );
}
