"use client";

import { useState } from "react";
import { useFormState } from "react-dom";

import { fahrschuleEinrichten, type FormState } from "@/app/auth/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { LogoUpload } from "@/components/shared/logo-upload";

const initial: FormState = {};

export function SetupForm({ defaultEmail }: { defaultEmail?: string }) {
  const [state, action] = useFormState(fahrschuleEinrichten, initial);
  const [zweite, setZweite] = useState(false);

  return (
    <form action={action} className="space-y-5">
      <FormMessage error={state.error} />

      <div className="space-y-2">
        <Label htmlFor="name">Name der Fahrschule *</Label>
        <Input id="name" name="name" required placeholder="z. B. Fahrschule Müller" />
      </div>

      <div className="space-y-2">
        <Label>Firmenlogo (optional)</Label>
        <LogoUpload />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="vorname">Dein Vorname *</Label>
          <Input id="vorname" name="vorname" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nachname">Dein Nachname *</Label>
          <Input id="nachname" name="nachname" required />
        </div>
      </div>

      <Separator />
      <p className="text-sm font-medium text-muted-foreground">
        Anschrift &amp; Kontakt (optional)
      </p>

      <div className="space-y-2">
        <Label htmlFor="strasse">Straße &amp; Hausnummer</Label>
        <Input id="strasse" name="strasse" placeholder="Musterstraße 1" />
      </div>

      <div className="grid grid-cols-[1fr_2fr] gap-3">
        <div className="space-y-2">
          <Label htmlFor="plz">PLZ</Label>
          <Input id="plz" name="plz" inputMode="numeric" placeholder="12345" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ort">Ort</Label>
          <Input id="ort" name="ort" placeholder="Musterstadt" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="telefon">Telefon</Label>
          <Input id="telefon" name="telefon" type="tel" placeholder="0123 456789" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-Mail (Betrieb)</Label>
          <Input id="email" name="email" type="email" defaultValue={defaultEmail} />
        </div>
      </div>

      <Separator />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={zweite}
          onChange={(e) => setZweite(e.target.checked)}
          className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
        />
        Zweite Fahrschule hinzufügen (für Filialketten)
      </label>

      {zweite && (
        <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
          <div className="space-y-2">
            <Label htmlFor="name2">Name der zweiten Fahrschule</Label>
            <Input id="name2" name="name2" placeholder="z. B. Fahrschule Müller – Filiale 2" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ort2">Ort (optional)</Label>
            <Input id="ort2" name="ort2" placeholder="Musterstadt" />
          </div>
          <p className="text-xs text-muted-foreground">
            Du wirst Chef beider Fahrschulen und kannst oben links jederzeit zwischen ihnen wechseln.
          </p>
        </div>
      )}

      <SubmitButton className="w-full" size="lg">
        Fahrschule einrichten
      </SubmitButton>
    </form>
  );
}
