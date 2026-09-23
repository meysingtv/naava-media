"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useFormState } from "react-dom";
import { Plus, Trash2 } from "lucide-react";

import { rechnungErstellen, type RechnungState } from "./actions";
import { Auswahl } from "@/components/ui/auswahl";
import { Button } from "@/components/ui/button";
import { DatumFeld } from "@/components/ui/datum-feld";
import { Field } from "@/components/ui/field";
import { FeldGitter } from "@/components/ui/formular";
import { Input } from "@/components/ui/input";
import { Karte } from "@/components/ui/karte";
import { Textarea } from "@/components/ui/textarea";
import { DetailKopf } from "@/components/shared/detail-kopf";
import { FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { STEUERSAETZE } from "@/lib/constants";
import { formatEuro } from "@/lib/utils";
import type { Leistung } from "@/lib/types";

interface SchuelerOption {
  id: string;
  vorname: string;
  nachname: string;
}

interface Position {
  key: number;
  beschreibung: string;
  menge: number;
  einheit: string;
  einzelpreis: number;
}

const initial: RechnungState = {};
let counter = 0;
const neuePosition = (): Position => ({
  key: counter++,
  beschreibung: "",
  menge: 1,
  einheit: "Stk",
  einzelpreis: 0,
});

function plusTage(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Rechnung schreiben: links Empfänger, Positionen und Notiz, rechts die
 * mitlaufende Summe mit dem Knopf zum Erstellen.
 */
export function RechnungForm({
  schueler,
  leistungen = [],
}: {
  schueler: SchuelerOption[];
  leistungen?: Leistung[];
}) {
  const [state, action] = useFormState(rechnungErstellen, initial);
  const [schuelerId, setSchuelerId] = useState("");
  const [satz, setSatz] = useState("19");
  const [positionen, setPositionen] = useState<Position[]>([neuePosition()]);
  const heute = new Date().toISOString().slice(0, 10);
  const [rechnungsdatum, setRechnungsdatum] = useState(heute);
  const [faellig, setFaellig] = useState("");

  function leistungHinzufuegen(id: string) {
    const l = leistungen.find((x) => x.id === id);
    if (!l) return;
    setPositionen((prev) => {
      const neu: Position = {
        key: counter++,
        beschreibung: l.name,
        menge: 1,
        einheit: l.einheit || "Stk",
        einzelpreis: Number(l.preis) || 0,
      };
      // Leere Startzeile ersetzen, sonst anhängen.
      if (prev.length === 1 && prev[0].beschreibung === "" && prev[0].einzelpreis === 0) return [neu];
      return [...prev, neu];
    });
  }

  const steuersatz = Number(satz);
  const netto = useMemo(() => positionen.reduce((s, p) => s + (p.menge || 0) * (p.einzelpreis || 0), 0), [positionen]);
  const steuer = netto * (steuersatz / 100);
  const brutto = netto + steuer;

  function aktualisiere(key: number, feld: keyof Position, wert: string) {
    setPositionen((prev) =>
      prev.map((p) =>
        p.key === key
          ? {
              ...p,
              [feld]: feld === "menge" || feld === "einzelpreis" ? Number(wert.replace(",", ".")) || 0 : wert,
            }
          : p,
      ),
    );
  }

  const empfaenger = schueler.find((s) => s.id === schuelerId);

  return (
    <form action={action}>
      <input type="hidden" name="schueler_id" value={schuelerId} />
      <input type="hidden" name="steuersatz" value={satz} />

      <DetailKopf
        zurueck={{ href: "/rechnungen", label: "Rechnungen" }}
        titel="Rechnung schreiben"
        kurztitel="Neue Rechnung"
        meta={["Positionen aus der Preisliste übernehmen oder frei eintragen"]}
      />

      {state.error && (
        <div className="mb-6">
          <FormMessage error={state.error} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <Karte titel="Empfänger und Daten" inhaltClassName="px-5 pb-5">
            <FeldGitter>
              <Field label="Schüler" className="sm:col-span-2">
                <Auswahl
                  optionen={schueler.map((s) => ({ value: s.id, label: `${s.vorname} ${s.nachname}` }))}
                  value={schuelerId}
                  onChange={setSchuelerId}
                  leerLabel="Ohne Schüler"
                  placeholder="Ohne Schüler"
                />
              </Field>
              <Field label="Rechnungsdatum">
                <DatumFeld name="rechnungsdatum" value={rechnungsdatum} onChange={setRechnungsdatum} />
              </Field>
              <Field label="Fällig bis" hint={faellig ? undefined : "Leer lassen für die übliche Frist"}>
                <DatumFeld name="faelligkeitsdatum" value={faellig} onChange={setFaellig} />
              </Field>
              <div className="flex flex-wrap gap-1.5 sm:col-span-2 sm:-mt-2">
                {[7, 14, 30].map((tage) => (
                  <button
                    key={tage}
                    type="button"
                    onClick={() => setFaellig(plusTage(rechnungsdatum || heute, tage))}
                    className="h-7 rounded-md border border-border-strong bg-card px-2.5 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-muted hover:text-foreground"
                  >
                    in {tage} Tagen fällig
                  </button>
                ))}
              </div>
              <Field label="Rechnungsnummer" hint="Leer lassen, dann wird sie fortlaufend vergeben">
                <Input name="nummer" placeholder="z. B. RE-2026-0001" />
              </Field>
              <Field label="Mehrwertsteuer">
                <Auswahl
                  optionen={STEUERSAETZE.map((s) => ({ value: String(s), label: `${s} %` }))}
                  value={satz}
                  onChange={(v) => setSatz(v || "19")}
                />
              </Field>
            </FeldGitter>
          </Karte>

          <Karte
            titel="Positionen"
            meta={`${positionen.length}`}
            aktion={
              leistungen.length > 0 ? (
                <Auswahl
                  optionen={leistungen.map((l) => ({ value: l.id, label: `${l.name} · ${formatEuro(Number(l.preis))}` }))}
                  value=""
                  onChange={(id) => id && leistungHinzufuegen(id)}
                  placeholder="Aus Preisliste übernehmen"
                  inputSize="sm"
                  className="w-[176px] sm:w-[240px]"
                />
              ) : undefined
            }
            inhaltClassName="pb-2"
          >
            <div className="hidden grid-cols-[minmax(0,1fr)_88px_88px_112px_104px_36px] gap-2 border-y border-border bg-surface-muted px-5 py-2 text-xs font-medium text-foreground-secondary sm:grid">
              <span>Beschreibung</span>
              <span>Menge</span>
              <span>Einheit</span>
              <span className="text-right">Einzelpreis</span>
              <span className="text-right">Betrag</span>
              <span />
            </div>
            <ul className="divide-y divide-border">
              {positionen.map((p, i) => (
                <li
                  key={p.key}
                  className="grid grid-cols-[minmax(0,1fr)_36px] gap-2 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_88px_88px_112px_104px_36px] sm:items-center"
                >
                  <Input
                    name="pos_beschreibung"
                    value={p.beschreibung}
                    onChange={(e) => aktualisiere(p.key, "beschreibung", e.target.value)}
                    placeholder="z. B. Übungsstunde 45 Min."
                    aria-label={`Beschreibung Position ${i + 1}`}
                    inputSize="sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-foreground-tertiary hover:text-destructive-text sm:order-last"
                    disabled={positionen.length === 1}
                    onClick={() => setPositionen((prev) => (prev.length > 1 ? prev.filter((x) => x.key !== p.key) : prev))}
                    aria-label={`Position ${i + 1} entfernen`}
                  >
                    <Trash2 />
                  </Button>
                  <div className="col-span-2 grid grid-cols-3 gap-2 sm:col-span-1 sm:contents">
                    <Input
                      name="pos_menge"
                      type="number"
                      step="0.5"
                      min="0"
                      value={p.menge}
                      onChange={(e) => aktualisiere(p.key, "menge", e.target.value)}
                      aria-label={`Menge Position ${i + 1}`}
                      inputSize="sm"
                    />
                    <Input
                      name="pos_einheit"
                      value={p.einheit}
                      onChange={(e) => aktualisiere(p.key, "einheit", e.target.value)}
                      aria-label={`Einheit Position ${i + 1}`}
                      inputSize="sm"
                    />
                    <Input
                      name="pos_einzelpreis"
                      type="number"
                      step="0.01"
                      min="0"
                      value={p.einzelpreis}
                      onChange={(e) => aktualisiere(p.key, "einzelpreis", e.target.value)}
                      aria-label={`Einzelpreis Position ${i + 1}`}
                      className="text-right"
                      inputSize="sm"
                      trailing="€"
                    />
                  </div>
                  <span className="hidden text-right text-13 font-medium tabular-nums text-foreground sm:block">
                    {formatEuro((p.menge || 0) * (p.einzelpreis || 0))}
                  </span>
                </li>
              ))}
            </ul>
            <div className="px-5 pb-3 pt-1">
              <Button type="button" variant="ghost" size="sm" className="-ml-2" onClick={() => setPositionen((p) => [...p, neuePosition()])}>
                <Plus /> Position hinzufügen
              </Button>
            </div>
          </Karte>

          <Karte titel="Notiz" meta="optional" inhaltClassName="px-5 pb-5">
            <Textarea name="notiz" rows={3} placeholder="Zahlungshinweis oder Verwendungszweck – erscheint auf der Rechnung" aria-label="Notiz" />
          </Karte>
        </div>

        {/* Mitlaufende Summe */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl bg-card p-5 shadow-panel">
            <p className="text-13 font-medium text-foreground-secondary">Rechnung an</p>
            <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
              {empfaenger ? `${empfaenger.vorname} ${empfaenger.nachname}` : "Ohne Schüler"}
            </p>
            <dl className="mt-5 space-y-2 border-t border-border pt-4 text-13 tabular-nums">
              <div className="flex justify-between text-foreground-secondary">
                <dt>Netto</dt>
                <dd>{formatEuro(netto)}</dd>
              </div>
              <div className="flex justify-between text-foreground-secondary">
                <dt>MwSt. {steuersatz} %</dt>
                <dd>{formatEuro(steuer)}</dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-border pt-3">
                <dt className="text-sm font-semibold text-foreground">Gesamt</dt>
                <dd className="text-xl font-semibold text-foreground">{formatEuro(brutto)}</dd>
              </div>
            </dl>
            <SubmitButton className="mt-5 w-full">Rechnung erstellen</SubmitButton>
            <Button asChild variant="ghost" size="sm" className="mt-2 w-full">
              <Link href="/rechnungen">Abbrechen</Link>
            </Button>
          </div>
        </aside>
      </div>
    </form>
  );
}
