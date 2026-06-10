"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { Check } from "lucide-react";

import { schuelerSpeichern, type SchuelerFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { AVATAR_FARBEN, FUEHRERSCHEINKLASSEN } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Fahrschueler } from "@/lib/types";

const initial: SchuelerFormState = {};

const feld =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Abschnitt({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function F({
  label,
  children,
  req,
}: {
  label: string;
  children: React.ReactNode;
  req?: boolean;
}) {
  return (
    <div className="min-w-0">
      <label className="mb-1 block text-[13px] font-medium text-foreground/80">
        {label}
        {req && <span className="text-destructive"> *</span>}
      </label>
      {children}
    </div>
  );
}

function Schalter({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
      />
      {label}
    </label>
  );
}

export function SchuelerForm({ schueler }: { schueler?: Fahrschueler }) {
  const [state, action] = useFormState(schuelerSpeichern, initial);
  const [tab, setTab] = useState<"kunde" | "preise">("kunde");
  const [klassen, setKlassen] = useState<string[]>(schueler?.fuehrerscheinklassen ?? []);
  const [farbe, setFarbe] = useState<string>(schueler?.avatar_farbe ?? AVATAR_FARBEN[0]);

  function toggleKlasse(k: string) {
    setKlassen((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  }

  const titel = schueler ? `${schueler.vorname} ${schueler.nachname}` : "Neuer Schüler";
  const abbrechenHref = schueler ? `/schueler?id=${schueler.id}` : "/schueler";
  const heute = new Date().toISOString().slice(0, 10);

  const tabCls = (aktiv: boolean) =>
    cn(
      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
      aktiv ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
    );

  return (
    <form action={action}>
      {schueler && <input type="hidden" name="id" value={schueler.id} />}
      <input type="hidden" name="avatar_farbe" value={farbe} />
      {klassen.map((k) => (
        <input key={k} type="hidden" name="klassen" value={k} />
      ))}

      {/* Kopfleiste: Name · Tabs · Speichern/Abbrechen */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <h1 className="text-base font-bold tracking-tight">{titel}</h1>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setTab("kunde")} className={tabCls(tab === "kunde")}>
              Kunde Daten
            </button>
            <button type="button" onClick={() => setTab("preise")} className={tabCls(tab === "preise")}>
              Add Ons | Preise
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" type="button">
            <a href={abbrechenHref}>Abbrechen</a>
          </Button>
          <SubmitButton size="sm">Speichern</SubmitButton>
        </div>
      </div>

      <div className="mb-4">
        <FormMessage error={state.error} />
      </div>

      {/* Tab: Kunde Daten */}
      <div className={cn("grid gap-6 lg:grid-cols-2", tab !== "kunde" && "hidden")}>
        {/* Linke Spalte: Kunde */}
        <div className="space-y-6 rounded-lg border bg-card p-4">
          <Abschnitt title="Kunde">
            <div className="grid grid-cols-2 gap-3">
              <F label="Anrede">
                <select name="anrede" defaultValue={schueler?.anrede ?? ""} className={feld}>
                  <option value="">—</option>
                  <option value="Herr">Herr</option>
                  <option value="Frau">Frau</option>
                  <option value="Divers">Divers</option>
                </select>
              </F>
              <div />
              <F label="Vorname" req>
                <input name="vorname" required defaultValue={schueler?.vorname} className={feld} />
              </F>
              <F label="Name" req>
                <input name="nachname" required defaultValue={schueler?.nachname} className={feld} />
              </F>
              <F label="Geburtsdatum">
                <input
                  name="geburtsdatum"
                  type="date"
                  defaultValue={schueler?.geburtsdatum ?? undefined}
                  className={feld}
                />
              </F>
              <F label="Geburtsort">
                <input name="geburtsort" defaultValue={schueler?.geburtsort ?? undefined} className={feld} />
              </F>
              <F label="Staatsangehörigkeit">
                <input
                  name="staatsangehoerigkeit"
                  defaultValue={schueler?.staatsangehoerigkeit ?? "Deutschland"}
                  className={feld}
                />
              </F>
            </div>
          </Abschnitt>

          <Abschnitt title="Adressdaten">
            <div className="grid grid-cols-2 gap-3">
              <F label="PLZ">
                <input name="plz" inputMode="numeric" defaultValue={schueler?.plz ?? undefined} className={feld} />
              </F>
              <F label="Ort">
                <input name="ort" defaultValue={schueler?.ort ?? undefined} className={feld} />
              </F>
              <div className="col-span-2">
                <F label="Straße &amp; Nr.">
                  <input name="strasse" defaultValue={schueler?.strasse ?? undefined} className={feld} />
                </F>
              </div>
              <F label="Mobil">
                <input name="telefon" type="tel" defaultValue={schueler?.telefon ?? undefined} className={feld} />
              </F>
              <F label="Telefon beruflich">
                <input
                  name="telefon_beruflich"
                  type="tel"
                  defaultValue={schueler?.telefon_beruflich ?? undefined}
                  className={feld}
                />
              </F>
              <div className="col-span-2">
                <F label="E-Mail">
                  <input name="email" type="email" defaultValue={schueler?.email ?? undefined} className={feld} />
                </F>
              </div>
            </div>
          </Abschnitt>

          <Abschnitt title="Zusatzinfos">
            <div className="grid grid-cols-2 gap-3">
              <F label="Filiale">
                <input name="filiale" defaultValue={schueler?.filiale ?? undefined} className={feld} />
              </F>
              <F label="Prüfort">
                <input name="pruefort" defaultValue={schueler?.pruefort ?? undefined} className={feld} />
              </F>
              <div className="col-span-2">
                <F label="Prüforganisation">
                  <input
                    name="prueforganisation"
                    defaultValue={schueler?.prueforganisation ?? undefined}
                    placeholder="z. B. TÜV Süd"
                    className={feld}
                  />
                </F>
              </div>
            </div>
            <Schalter name="sehhilfe" label="Sehhilfe erforderlich" defaultChecked={schueler?.sehhilfe} />
            <F label="Info / Notizen">
              <textarea
                name="notizen"
                rows={3}
                defaultValue={schueler?.notizen ?? undefined}
                placeholder="Interne Notizen …"
                className={cn(feld, "h-auto py-2")}
              />
            </F>
            <div>
              <label className="mb-1 block text-[13px] font-medium text-foreground/80">Avatar-Farbe</label>
              <div className="flex flex-wrap gap-2">
                {AVATAR_FARBEN.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFarbe(f)}
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full ring-offset-2 transition",
                      farbe === f && "ring-2 ring-foreground",
                    )}
                    style={{ backgroundColor: f }}
                    aria-label={`Farbe ${f}`}
                  >
                    {farbe === f && <Check className="h-3.5 w-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </Abschnitt>
        </div>

        {/* Rechte Spalte: Ausbildung */}
        <div className="space-y-6 rounded-lg border bg-card p-4">
          <Abschnitt title="Ausbildung">
            <div>
              <label className="mb-1 block text-[13px] font-medium text-foreground/80">Führerscheinklassen</label>
              <div className="flex flex-wrap gap-1.5">
                {FUEHRERSCHEINKLASSEN.map((k) => {
                  const aktiv = klassen.includes(k);
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => toggleKlasse(k)}
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-sm font-medium transition-colors",
                        aktiv
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-background hover:bg-accent",
                      )}
                    >
                      {k}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <F label="Schlüsselzahl">
                <input name="schluesselzahl" defaultValue={schueler?.schluesselzahl ?? undefined} className={feld} />
              </F>
              <F label="Erteilungsart">
                <select name="erteilungsart" defaultValue={schueler?.erteilungsart ?? ""} className={feld}>
                  <option value="">—</option>
                  <option value="Ersterteilung">Ersterteilung</option>
                  <option value="Erweiterung">Erweiterung</option>
                </select>
              </F>
              <div className="col-span-2">
                <F label="Führerscheinnummer">
                  <input
                    name="fuehrerscheinnummer"
                    defaultValue={schueler?.fuehrerscheinnummer ?? undefined}
                    className={feld}
                  />
                </F>
              </div>
              <F label="Anmeldedatum" req>
                <input
                  name="anmeldedatum"
                  type="date"
                  required
                  defaultValue={schueler?.anmeldedatum ?? heute}
                  className={feld}
                />
              </F>
              <F label="Kurs">
                <input name="kurs" defaultValue={schueler?.kurs ?? undefined} className={feld} />
              </F>
            </div>
            <Schalter name="bf17" label="Begleitetes Fahren ab 17 (BF17)" defaultChecked={schueler?.bf17} />
          </Abschnitt>

          <Abschnitt title="Prüfung">
            <div className="grid grid-cols-2 gap-3">
              <F label="Theorieprüfung">
                <input
                  name="theorie_termin"
                  type="date"
                  defaultValue={schueler?.theorie_termin ?? undefined}
                  className={feld}
                />
              </F>
              <F label="Theorie – Versuch">
                <input
                  name="theorie_versuch"
                  type="number"
                  min="1"
                  defaultValue={schueler?.theorie_versuch ?? 1}
                  className={feld}
                />
              </F>
              <F label="Praktische Prüfung">
                <input
                  name="pruefung_termin"
                  type="date"
                  defaultValue={schueler?.pruefung_termin ?? undefined}
                  className={feld}
                />
              </F>
              <F label="Praxis – Versuch">
                <input
                  name="praxis_versuch"
                  type="number"
                  min="1"
                  defaultValue={schueler?.praxis_versuch ?? 1}
                  className={feld}
                />
              </F>
            </div>
            <div className="space-y-2">
              <Schalter
                name="theorie_bestanden"
                label="Theorieprüfung bestanden"
                defaultChecked={schueler?.theorie_bestanden}
              />
              <Schalter
                name="ausbildung_beendet"
                label="Ausbildung beendet"
                defaultChecked={schueler?.ausbildung_beendet}
              />
            </div>
          </Abschnitt>
        </div>
      </div>

      {/* Tab: Add Ons | Preise */}
      <div className={cn(tab !== "preise" && "hidden")}>
        <div className="space-y-6 rounded-lg border bg-card p-4 lg:max-w-2xl">
          <Abschnitt title="Zahlungsdaten">
            <div className="grid grid-cols-2 gap-3">
              <F label="Preisliste">
                <input name="preisliste" defaultValue={schueler?.preisliste ?? undefined} className={feld} />
              </F>
              <F label="Zahlungsart">
                <select name="zahlungsart" defaultValue={schueler?.zahlungsart ?? ""} className={feld}>
                  <option value="">—</option>
                  <option value="Bar">Bar</option>
                  <option value="SEPA-Lastschrift">SEPA-Lastschrift</option>
                  <option value="Überweisung">Überweisung</option>
                  <option value="ClassicPay">ClassicPay</option>
                </select>
              </F>
              <div className="col-span-2">
                <F label="IBAN">
                  <input name="iban" defaultValue={schueler?.iban ?? undefined} placeholder="DE…" className={feld} />
                </F>
              </div>
              <F label="Kostenträger">
                <input name="kostentraeger" defaultValue={schueler?.kostentraeger ?? undefined} className={feld} />
              </F>
              <F label="E-Mail (Kostenträger)">
                <input
                  name="kostentraeger_email"
                  type="email"
                  defaultValue={schueler?.kostentraeger_email ?? undefined}
                  className={feld}
                />
              </F>
              <div className="col-span-2">
                <F label="Vorgangsnummer">
                  <input
                    name="vorgangsnummer"
                    defaultValue={schueler?.vorgangsnummer ?? undefined}
                    className={feld}
                  />
                </F>
              </div>
            </div>
            <Schalter name="intensivkurs" label="Intensivkurs" defaultChecked={schueler?.intensivkurs} />
          </Abschnitt>

          <Abschnitt title="Lern-App">
            <F label="Theorie-Lernstatus (%)">
              <input
                name="lernstatus"
                type="number"
                min="0"
                max="100"
                defaultValue={schueler?.lernstatus ?? 0}
                className={cn(feld, "max-w-[160px]")}
              />
            </F>
            <p className="text-xs text-muted-foreground">
              Aktuell manuell – oder per KI-Sammelerfassung in der Übersicht.
            </p>
          </Abschnitt>
        </div>
      </div>
    </form>
  );
}
