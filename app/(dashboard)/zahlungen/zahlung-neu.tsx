"use client";

import { useState } from "react";

import { Auswahl } from "@/components/ui/auswahl";
import { DatumFeld } from "@/components/ui/datum-feld";
import { Field } from "@/components/ui/field";
import { FeldGitter } from "@/components/ui/formular";
import { Input } from "@/components/ui/input";
import { FormularDialog } from "@/components/shared/formular-dialog";
import { ZAHLARTEN } from "@/lib/constants";
import { formatEuro } from "@/lib/utils";
import { zahlungErfassen } from "./actions";

export interface OffeneRechnung {
  id: string;
  nummer: string;
  betrag: number;
  schueler_id: string | null;
  schueler: string;
}

// „Online (Stripe)“ bucht nur der Stripe-Webhook – nicht von Hand erfassbar.
const ZAHLART_OPTIONEN = Object.entries(ZAHLARTEN)
  .filter(([value]) => value !== "online")
  .map(([value, label]) => ({ value, label }));

interface Props {
  schueler: { id: string; label: string }[];
  offene: OffeneRechnung[];
}

export function ZahlungNeu(props: Props) {
  return (
    <FormularDialog
      action={zahlungErfassen}
      ausloeser="Zahlung erfassen"
      titel="Zahlung erfassen"
      beschreibung="Zahlungseingang buchen – auf Wunsch direkt einer offenen Rechnung zuordnen."
      speichernLabel="Buchen"
      erfolg="Zahlung erfasst"
    >
      <Felder {...props} />
    </FormularDialog>
  );
}

/** Eigene Komponente, damit die Auswahl bei jedem Öffnen frisch beginnt. */
function Felder({ schueler, offene }: Props) {
  const [rechnungId, setRechnungId] = useState("");
  const [schuelerId, setSchuelerId] = useState("");
  const [betrag, setBetrag] = useState("");
  const heute = new Date().toISOString().slice(0, 10);

  function rechnungWaehlen(id: string) {
    setRechnungId(id);
    const r = offene.find((o) => o.id === id);
    if (r) {
      setBetrag(r.betrag.toFixed(2));
      if (r.schueler_id) setSchuelerId(r.schueler_id);
    }
  }

  return (
    <FeldGitter>
      <Field
        label="Offene Rechnung"
        hint={rechnungId ? "Diese Rechnung wird automatisch als „bezahlt“ markiert." : "Optional"}
        className="sm:col-span-2"
      >
        <Auswahl
          name="rechnung_id"
          optionen={offene.map((o) => ({ value: o.id, label: `${o.nummer} · ${o.schueler} · ${formatEuro(o.betrag)}` }))}
          value={rechnungId}
          onChange={rechnungWaehlen}
          leerLabel="Keine Zuordnung"
          placeholder="Keine Zuordnung"
        />
      </Field>
      <Field label="Betrag" required>
        <Input
          name="betrag"
          type="number"
          step="0.01"
          min="0"
          required
          value={betrag}
          onChange={(e) => setBetrag(e.target.value)}
          trailing="€"
        />
      </Field>
      <Field label="Zahlart">
        <Auswahl name="art" optionen={ZAHLART_OPTIONEN} defaultValue="ueberweisung" />
      </Field>
      <Field label="Schüler">
        <Auswahl
          name="schueler_id"
          optionen={schueler.map((s) => ({ value: s.id, label: s.label }))}
          value={schuelerId}
          onChange={setSchuelerId}
          leerLabel="Kein Schüler"
          placeholder="Kein Schüler"
        />
      </Field>
      <Field label="Datum">
        <DatumFeld name="datum" defaultValue={heute} />
      </Field>
      <Field label="Notiz" className="sm:col-span-2">
        <Input name="notiz" placeholder="Optional" />
      </Field>
    </FeldGitter>
  );
}
