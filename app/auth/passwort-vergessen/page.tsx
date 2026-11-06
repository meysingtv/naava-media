"use client";

import Link from "next/link";
import { useFormState } from "react-dom";

import { passwortVergessen, type FormState } from "@/app/auth/actions";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { AuthKopf } from "../auth-kopf";

const initial: FormState = {};

export default function PasswortVergessenPage() {
  const [state, action] = useFormState(passwortVergessen, initial);

  return (
    <>
      <AuthKopf titel="Passwort vergessen?" text="Gib deine E-Mail-Adresse ein. Wir schicken dir einen Link, mit dem du ein neues Passwort festlegst." />
      {state.message ? (
        <FormMessage message={state.message} />
      ) : (
        <form action={action}>
          <div className="space-y-5">
            <FormMessage error={state.error} />
            <Field label="E-Mail">
              <Input name="email" type="email" autoComplete="email" required placeholder="name@fahrschule.de" />
            </Field>
            <SubmitButton size="lg" className="h-10 w-full">
              Link anfordern
            </SubmitButton>
          </div>
        </form>
      )}
      <p className="mt-8 text-13 text-foreground-secondary">
        <Link href="/auth/login" className="font-medium text-primary-text hover:underline">
          Zurück zur Anmeldung
        </Link>
      </p>
    </>
  );
}
