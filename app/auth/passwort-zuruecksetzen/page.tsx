"use client";

import { useFormState } from "react-dom";

import { passwortAktualisieren, type FormState } from "@/app/auth/actions";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { AuthKopf } from "../auth-kopf";

const initial: FormState = {};

export default function PasswortZuruecksetzenPage() {
  const [state, action] = useFormState(passwortAktualisieren, initial);

  return (
    <>
      <AuthKopf titel="Neues Passwort festlegen" text="Wähle ein sicheres Passwort mit mindestens 8 Zeichen." />
      <form action={action}>
        <div className="space-y-5">
          <FormMessage error={state.error} />
          <Field label="Neues Passwort">
            <Input name="passwort" type="password" autoComplete="new-password" required minLength={8} />
          </Field>
          <Field label="Passwort wiederholen">
            <Input name="passwort_wdh" type="password" autoComplete="new-password" required minLength={8} />
          </Field>
          <SubmitButton size="lg" className="h-10 w-full">
            Passwort speichern
          </SubmitButton>
        </div>
      </form>
    </>
  );
}
