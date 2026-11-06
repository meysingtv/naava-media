"use client";

import { useFormState } from "react-dom";

import { registrieren, type FormState } from "@/app/auth/actions";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";

const initial: FormState = {};

export function RegisterForm() {
  const [state, action] = useFormState(registrieren, initial);

  // Nach erfolgreicher Registrierung (E-Mail-Bestätigung nötig) nur den Hinweis zeigen.
  if (state.message) {
    return <FormMessage message={state.message} />;
  }

  return (
    <form action={action}>
      <div className="space-y-5">
        <FormMessage error={state.error} />
        <Field label="E-Mail">
          <Input name="email" type="email" autoComplete="email" required placeholder="name@fahrschule.de" />
        </Field>
        <Field label="Passwort" hint="Mindestens 8 Zeichen">
          <Input name="passwort" type="password" autoComplete="new-password" required minLength={8} />
        </Field>
        <Field label="Passwort wiederholen">
          <Input name="passwort_wdh" type="password" autoComplete="new-password" required minLength={8} />
        </Field>
        <SubmitButton size="lg" className="h-10 w-full">
          Konto erstellen
        </SubmitButton>
        <p className="text-xs leading-5 text-foreground-tertiary">
          Mit der Registrierung akzeptierst du die{" "}
          <a href="/agb" className="underline hover:text-foreground">
            AGB
          </a>{" "}
          und die{" "}
          <a href="/datenschutz" className="underline hover:text-foreground">
            Datenschutzerklärung
          </a>
          .
        </p>
      </div>
    </form>
  );
}
