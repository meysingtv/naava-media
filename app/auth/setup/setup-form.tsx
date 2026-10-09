"use client";

import { useState } from "react";
import { useFormState } from "react-dom";

import { fahrschuleEinrichten, type FormState } from "@/app/auth/actions";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/shared/form-message";
import { LogoUpload } from "@/components/shared/logo-upload";
import { SubmitButton } from "@/components/shared/submit-button";

const initial: FormState = {};

export function SetupForm({ defaultEmail }: { defaultEmail?: string }) {
  const [state, action] = useFormState(fahrschuleEinrichten, initial);
  const [zweite, setZweite] = useState(false);

  return (
    <form action={action}>
      <div className="space-y-5">
        <FormMessage error={state.error} />

        <Field label="Name der Fahrschule" required>
          <Input name="name" required placeholder="z. B. Fahrschule Müller" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Dein Vorname" required>
            <Input name="vorname" required autoComplete="given-name" />
          </Field>
          <Field label="Dein Nachname" required>
            <Input name="nachname" required autoComplete="family-name" />
          </Field>
        </div>

        <div className="border-t border-border pt-5">
          <p className="mb-4 text-13 font-medium text-foreground-secondary">Anschrift und Kontakt – kannst du auch später ergänzen</p>
          <div className="space-y-5">
            <Field label="Straße und Hausnummer">
              <Input name="strasse" autoComplete="street-address" />
            </Field>
            <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-3">
              <Field label="PLZ">
                <Input name="plz" inputMode="numeric" autoComplete="postal-code" />
              </Field>
              <Field label="Ort">
                <Input name="ort" autoComplete="address-level2" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Telefon">
                <Input name="telefon" type="tel" autoComplete="tel" />
              </Field>
              <Field label="E-Mail der Fahrschule">
                <Input name="email" type="email" defaultValue={defaultEmail} />
              </Field>
            </div>
            <div>
              <p className="mb-1.5 text-13 font-medium text-foreground">Logo</p>
              <LogoUpload />
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-5">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={zweite}
              onChange={(e) => setZweite(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-border-strong"
            />
            <span>
              <span className="block text-13 font-medium text-foreground">Zweite Fahrschule anlegen</span>
              <span className="block text-xs text-foreground-secondary">Für Filialen – du wechselst oben links zwischen ihnen.</span>
            </span>
          </label>
          {zweite && (
            <div className="mt-4 grid grid-cols-[minmax(0,1fr)_140px] gap-3">
              <Field label="Name der zweiten Fahrschule">
                <Input name="name2" placeholder="z. B. Filiale Nord" />
              </Field>
              <Field label="Ort">
                <Input name="ort2" />
              </Field>
            </div>
          )}
        </div>

        <SubmitButton size="lg" className="h-10 w-full">
          Fahrschule einrichten
        </SubmitButton>
      </div>
    </form>
  );
}
