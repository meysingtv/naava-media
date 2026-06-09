"use client";

import { useFormState } from "react-dom";

import { fahrschuleAktualisieren, type EinstellungenState } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import type { Fahrschule } from "@/lib/types";

const initial: EinstellungenState = {};

export function EinstellungenForm({ fahrschule }: { fahrschule: Fahrschule }) {
  const [state, action] = useFormState(fahrschuleAktualisieren, initial);

  return (
    <form action={action} className="space-y-6">
      <FormMessage error={state.error} message={state.message} />

      <Card>
        <CardHeader>
          <CardTitle>Stammdaten</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Name der Fahrschule *</Label>
            <Input id="name" name="name" required defaultValue={fahrschule.name} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="strasse">Straße &amp; Hausnummer</Label>
            <Input id="strasse" name="strasse" defaultValue={fahrschule.strasse ?? undefined} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plz">PLZ</Label>
            <Input id="plz" name="plz" defaultValue={fahrschule.plz ?? undefined} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ort">Ort</Label>
            <Input id="ort" name="ort" defaultValue={fahrschule.ort ?? undefined} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kontakt</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="telefon">Telefon</Label>
            <Input id="telefon" name="telefon" type="tel" defaultValue={fahrschule.telefon ?? undefined} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input id="email" name="email" type="email" defaultValue={fahrschule.email ?? undefined} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="website">Website</Label>
            <Input id="website" name="website" placeholder="https://" defaultValue={fahrschule.website ?? undefined} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rechnungsdaten</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="iban">IBAN</Label>
            <Input id="iban" name="iban" defaultValue={fahrschule.iban ?? undefined} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="steuernummer">Steuernummer</Label>
            <Input id="steuernummer" name="steuernummer" defaultValue={fahrschule.steuernummer ?? undefined} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <SubmitButton>Änderungen speichern</SubmitButton>
      </div>
    </form>
  );
}
