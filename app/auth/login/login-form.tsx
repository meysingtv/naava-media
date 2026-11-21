"use client";

import Link from "next/link";
import { useFormState } from "react-dom";

import { anmelden, type FormState } from "@/app/auth/actions";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";

const initial: FormState = {};

export function LoginForm({ weiter }: { weiter?: string }) {
  const [state, action] = useFormState(anmelden, initial);

  return (
    <form action={action}>
      <input type="hidden" name="weiter" value={weiter ?? "/dashboard"} />
      <div className="space-y-5">
        <FormMessage error={state.error} />
        <Field label="E-Mail">
          <Input name="email" type="email" autoComplete="email" required placeholder="name@fahrschule.de" />
        </Field>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <Label htmlFor="passwort">Passwort</Label>
            <Link href="/auth/passwort-vergessen" className="text-13 font-medium text-primary-text hover:underline">
              Passwort vergessen?
            </Link>
          </div>
          <Input id="passwort" name="passwort" type="password" autoComplete="current-password" required />
        </div>
        <SubmitButton size="lg" className="h-10 w-full">
          Anmelden
        </SubmitButton>
      </div>
    </form>
  );
}
