"use client";

import { useState } from "react";

import { theoriestundeErstellen } from "./actions";
import { Auswahl } from "@/components/ui/auswahl";
import { DatumFeld } from "@/components/ui/datum-feld";
import { Field } from "@/components/ui/field";
import { FeldGitter } from "@/components/ui/formular";
import { Input } from "@/components/ui/input";
import { ZeitFeld } from "@/components/ui/zeit-feld";
import { FormularDialog } from "@/components/shared/formular-dialog";
import { THEORIE_THEMEN } from "@/lib/constants";

const EIGENES = "__eigenes__";

export function TheoriestundeDialog() {
  const heute = new Date().toISOString().slice(0, 10);

  return (
    <FormularDialog
      action={theoriestundeErstellen}
      ausloeser="Neue Theoriestunde"
      titel="Neue Theoriestunde"
      beschreibung="Termin für den Theorieunterricht planen. Die Anwesenheit trägst du danach beim Termin ein."
      erfolg="Theoriestunde angelegt"
    >
      <FeldGitter>
        <Field label="Datum" required>
          <DatumFeld name="datum" required defaultValue={heute} />
        </Field>
        <Field label="Uhrzeit" required>
          <ZeitFeld name="uhrzeit" required defaultValue="18:00" />
        </Field>
        <ThemaFelder />
        <Field label="Max. Teilnehmer">
          <Input name="max_teilnehmer" type="number" min={1} defaultValue={20} />
        </Field>
      </FeldGitter>
    </FormularDialog>
  );
}

/** Thema aus dem Lehrplan wählen – oder ein eigenes eintragen. */
function ThemaFelder() {
  const [wahl, setWahl] = useState("");
  const eigenes = wahl === EIGENES;

  return (
    <>
      <Field label="Thema" className="sm:col-span-2">
        <Auswahl
          optionen={[...THEORIE_THEMEN.map((t) => ({ value: t, label: t })), { value: EIGENES, label: "Eigenes Thema …" }]}
          value={wahl}
          onChange={setWahl}
          leerLabel="Ohne Thema"
          placeholder="Thema wählen"
        />
      </Field>
      {eigenes ? (
        <Field label="Eigenes Thema" required className="sm:col-span-2">
          <Input name="thema" required autoFocus placeholder="z. B. Wiederholung Vorfahrt" />
        </Field>
      ) : (
        <input type="hidden" name="thema" value={wahl} />
      )}
    </>
  );
}
