"use client";

import { Auswahl } from "@/components/ui/auswahl";
import { DatumFeld } from "@/components/ui/datum-feld";
import { Field } from "@/components/ui/field";
import { FeldGitter } from "@/components/ui/formular";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormularDialog } from "@/components/shared/formular-dialog";
import { kursErstellen } from "./actions";

export function KursNeu({ klassen }: { klassen: string[] }) {
  return (
    <FormularDialog
      action={kursErstellen}
      ausloeser="Kurs anlegen"
      titel="Neuer Kurs"
      beschreibung="Theoriekurs für eine Gruppe planen. Termine und Teilnehmer ergänzt du im Kurs."
      erfolg="Kurs angelegt"
    >
      <Field label="Kursname" required>
        <Input name="name" required autoFocus placeholder="z. B. Abendkurs Klasse B – März" />
      </Field>
      <FeldGitter>
        <Field label="Klasse">
          <Auswahl name="klasse" optionen={klassen.map((k) => ({ value: k, label: k }))} leerLabel="Keine Angabe" placeholder="Keine Angabe" />
        </Field>
        <Field label="Start">
          <DatumFeld name="start_datum" />
        </Field>
      </FeldGitter>
      <Field label="Beschreibung">
        <Textarea name="beschreibung" rows={3} placeholder="Optional" />
      </Field>
    </FormularDialog>
  );
}
