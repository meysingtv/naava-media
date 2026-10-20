"use client";

import { Auswahl } from "@/components/ui/auswahl";
import { DatumFeld } from "@/components/ui/datum-feld";
import { Field } from "@/components/ui/field";
import { FeldGitter } from "@/components/ui/formular";
import { Input } from "@/components/ui/input";
import { FormularDialog } from "@/components/shared/formular-dialog";
import { kassenEintragErstellen } from "./actions";

const ARTEN = [
  { value: "einnahme", label: "Einnahme" },
  { value: "ausgabe", label: "Ausgabe" },
];

export function KassenbuchNeu() {
  const heute = new Date().toISOString().slice(0, 10);

  return (
    <FormularDialog
      action={kassenEintragErstellen}
      ausloeser="Kassen-Eintrag"
      ausloeserVariante="outline"
      titel="Kassenbuch-Eintrag"
      beschreibung="Bareinnahme oder Barausgabe erfassen."
      speichernLabel="Speichern"
      erfolg="Kassenbuch-Eintrag gespeichert"
    >
      <FeldGitter>
        <Field label="Art">
          <Auswahl name="typ" optionen={ARTEN} defaultValue="einnahme" />
        </Field>
        <Field label="Betrag" required>
          <Input name="betrag" type="number" step="0.01" min="0" required placeholder="0,00" trailing="€" />
        </Field>
        <Field label="Datum">
          <DatumFeld name="datum" defaultValue={heute} />
        </Field>
        <Field label="Beleg-Nr.">
          <Input name="beleg" placeholder="z. B. B-2026-001" />
        </Field>
        <Field label="Kategorie" className="sm:col-span-2">
          <Input name="kategorie" placeholder="z. B. Barzahlung Fahrstunde, Tanken, Büro" />
        </Field>
        <Field label="Beschreibung" className="sm:col-span-2">
          <Input name="beschreibung" placeholder="Optional" />
        </Field>
      </FeldGitter>
    </FormularDialog>
  );
}
