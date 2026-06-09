"use client";

import Link from "next/link";
import { useFormState } from "react-dom";

import { anmelden, type FormState } from "@/app/auth/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormMessage } from "@/components/shared/form-message";

const initial: FormState = {};

export function LoginForm({ weiter }: { weiter?: string }) {
  const [state, action] = useFormState(anmelden, initial);

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
        <div className="flex items-center justify-between">
          <Label htmlFor="passwort">Passwort</Label>
          <Link
            href="/auth/passwort-vergessen"
            className="text-xs font-medium text-primary hover:underline"
          >
            Passwort vergessen?
          </Link>
        </div>
        <Input
          id="passwort"
          name="passwort"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <input type="hidden" name="weiter" value={weiter ?? "/dashboard"} />
      <SubmitButton className="w-full">Anmelden</SubmitButton>
    </form>
  );
}
