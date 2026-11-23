"use client";

import { Auswahl } from "@/components/ui/auswahl";
import { DatumFeld } from "@/components/ui/datum-feld";
import { Field } from "@/components/ui/field";
import { FeldGitter } from "@/components/ui/formular";
import { Input } from "@/components/ui/input";
import { FormularDialog } from "@/components/shared/formular-dialog";
import { aufgabeErstellen } from "./actions";

const PRIORITAETEN = [
  { value: "hoch", label: "Hoch" },
  { value: "mittel", label: "Mittel" },
  { value: "niedrig", label: "Niedrig" },
];

export function AufgabeNeu({ schueler }: { schueler: { id: string; label: string }[] }) {
  return (
    <FormularDialog
      action={aufgabeErstellen}
      ausloeser="Neue Aufgabe"
      titel="Neue Aufgabe"
      beschreibung="Ein To-do für dich oder das Team, auf Wunsch mit Frist und Schüler."
      erfolg="Aufgabe angelegt"
    >
      <Field label="Titel" required>
        <Input name="titel" required placeholder="z. B. Sehtest nachfordern" autoFocus />
      </Field>
      <FeldGitter>
        <Field label="Priorität">
          <Auswahl name="prioritaet" optionen={PRIORITAETEN} defaultValue="mittel" />
        </Field>
        <Field label="Fällig am">
          <DatumFeld name="faellig_am" />
        </Field>
      </FeldGitter>
      <Field label="Schüler" hint="Optional">
        <Auswahl
          name="schueler_id"
          optionen={schueler.map((s) => ({ value: s.id, label: s.label }))}
          leerLabel="Kein Schüler"
          placeholder="Kein Schüler"
        />
      </Field>
    </FormularDialog>
  );
}
