"use client";

import { useFormState } from "react-dom";

import { registrieren, type FormState } from "@/app/auth/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormMessage } from "@/components/shared/form-message";

const initial: FormState = {};

export function RegisterForm() {
  const [state, action] = useFormState(registrieren, initial);

  // Nach erfolgreicher Registrierung (E-Mail-Bestätigung nötig) nur Hinweis zeigen.
  if (state.message) {
    return <FormMessage message={state.message} />;
  }

  return (
    <form action={action} className="space-y-4">
      <FormMessage error={state.error} />
      <div className="space-y-2">
        <Label htmlFor="email">E-Mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="name@fahrschule.de"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="passwort">Passwort</Label>
        <Input
          id="passwort"
          name="passwort"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="Mindestens 8 Zeichen"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="passwort_wdh">Passwort wiederholen</Label>
        <Input
          id="passwort_wdh"
          name="passwort_wdh"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </div>
      <SubmitButton className="w-full">Konto erstellen</SubmitButton>
    </form>
  );
}
