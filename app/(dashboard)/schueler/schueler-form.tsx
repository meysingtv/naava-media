"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { Check } from "lucide-react";

import { schuelerSpeichern, type SchuelerFormState } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { AVATAR_FARBEN, FUEHRERSCHEINKLASSEN } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Fahrschueler } from "@/lib/types";

const initial: SchuelerFormState = {};

export function SchuelerForm({ schueler }: { schueler?: Fahrschueler }) {
  const [state, action] = useFormState(schuelerSpeichern, initial);
  const [klassen, setKlassen] = useState<string[]>(schueler?.fuehrerscheinklassen ?? []);
  const [farbe, setFarbe] = useState<string>(schueler?.avatar_farbe ?? AVATAR_FARBEN[0]);

  function toggleKlasse(k: string) {
    setKlassen((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  }

  return (
    <form action={action} className="space-y-6">
      {schueler && <input type="hidden" name="id" value={schueler.id} />}
      <input type="hidden" name="avatar_farbe" value={farbe} />
      {klassen.map((k) => (
        <input key={k} type="hidden" name="klassen" value={k} />
      ))}

      <FormMessage error={state.error} />

      <Card>
        <CardHeader>
          <CardTitle>Persönliche Daten</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="vorname">Vorname *</Label>
            <Input id="vorname" name="vorname" required defaultValue={schueler?.vorname} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nachname">Nachname *</Label>
            <Input id="nachname" name="nachname" required defaultValue={schueler?.nachname} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="geburtsdatum">Geburtsdatum</Label>
            <Input
              id="geburtsdatum"
              name="geburtsdatum"
              type="date"
              defaultValue={schueler?.geburtsdatum ?? undefined}
            />
          </div>
          <div className="space-y-2">
            <Label>Avatar-Farbe</Label>
            <div className="flex flex-wrap gap-2 pt-1">
              {AVATAR_FARBEN.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFarbe(f)}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full ring-offset-2 transition",
                    farbe === f && "ring-2 ring-foreground",
                  )}
                  style={{ backgroundColor: f }}
                  aria-label={`Farbe ${f}`}
                >
                  {farbe === f && <Check className="h-4 w-4 text-white" />}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kontakt &amp; Anschrift</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="telefon">Telefon</Label>
            <Input id="telefon" name="telefon" type="tel" defaultValue={schueler?.telefon ?? undefined} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input id="email" name="email" type="email" defaultValue={schueler?.email ?? undefined} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="strasse">Straße &amp; Hausnummer</Label>
            <Input id="strasse" name="strasse" defaultValue={schueler?.strasse ?? undefined} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plz">PLZ</Label>
            <Input id="plz" name="plz" inputMode="numeric" defaultValue={schueler?.plz ?? undefined} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ort">Ort</Label>
            <Input id="ort" name="ort" defaultValue={schueler?.ort ?? undefined} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ausbildung</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Führerscheinklassen</Label>
            <div className="flex flex-wrap gap-2">
              {FUEHRERSCHEINKLASSEN.map((k) => {
                const aktiv = klassen.includes(k);
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => toggleKlasse(k)}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {!schueler && (
              <div className="space-y-2">
                <Label htmlFor="anmeldedatum">Anmeldedatum</Label>
                <Input
                  id="anmeldedatum"
                  name="anmeldedatum"
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="theorie_termin">Theorieprüfung</Label>
              <Input
                id="theorie_termin"
                name="theorie_termin"
                type="date"
                defaultValue={schueler?.theorie_termin ?? undefined}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pruefung_termin">Praktische Prüfung</Label>
              <Input
                id="pruefung_termin"
                name="pruefung_termin"
                type="date"
                defaultValue={schueler?.pruefung_termin ?? undefined}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="theorie_bestanden"
              defaultChecked={schueler?.theorie_bestanden}
              className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
            />
            Theorieprüfung bestanden
          </label>

          <div className="space-y-2">
            <Label htmlFor="notizen">Notizen</Label>
            <Textarea
              id="notizen"
              name="notizen"
              rows={3}
              defaultValue={schueler?.notizen ?? undefined}
              placeholder="Interne Notizen zum Schüler …"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Verwaltung &amp; Prüfung</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="kostentraeger">Kostenträger</Label>
            <Input
              id="kostentraeger"
              name="kostentraeger"
              defaultValue={schueler?.kostentraeger ?? undefined}
              placeholder="z. B. Jobcenter, Arbeitgeber"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filiale">Filiale</Label>
            <Input
              id="filiale"
              name="filiale"
              defaultValue={schueler?.filiale ?? undefined}
              placeholder="z. B. München"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preisliste">Preisliste</Label>
            <Input id="preisliste" name="preisliste" defaultValue={schueler?.preisliste ?? undefined} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prueforganisation">Prüforganisation</Label>
            <Input
              id="prueforganisation"
              name="prueforganisation"
              defaultValue={schueler?.prueforganisation ?? undefined}
              placeholder="z. B. TÜV Süd"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="iban">IBAN</Label>
            <Input
              id="iban"
              name="iban"
              defaultValue={schueler?.iban ?? undefined}
              placeholder="DE…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="theorie_versuch">Theorieprüfung – Versuch</Label>
            <Input
              id="theorie_versuch"
              name="theorie_versuch"
              type="number"
              min="1"
              defaultValue={schueler?.theorie_versuch ?? 1}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="praxis_versuch">Praktische Prüfung – Versuch</Label>
            <Input
              id="praxis_versuch"
              name="praxis_versuch"
              type="number"
              min="1"
              defaultValue={schueler?.praxis_versuch ?? 1}
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
            <input
              type="checkbox"
              name="intensivkurs"
              defaultChecked={schueler?.intensivkurs}
              className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
            />
            Intensivkurs
          </label>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button asChild variant="outline" type="button">
          <a href={schueler ? `/schueler?id=${schueler.id}` : "/schueler"}>Abbrechen</a>
        </Button>
        <SubmitButton>{schueler ? "Änderungen speichern" : "Schüler anlegen"}</SubmitButton>
      </div>
    </form>
  );
}
