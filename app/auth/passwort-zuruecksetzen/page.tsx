"use client";

import { useFormState } from "react-dom";

import { passwortAktualisieren, type FormState } from "@/app/auth/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormMessage } from "@/components/shared/form-message";

const initial: FormState = {};

export default function PasswortZuruecksetzenPage() {
  const [state, action] = useFormState(passwortAktualisieren, initial);

  return (
    <Card>
      <CardHeader className="px-6 pb-3 pt-6 sm:px-7 sm:pt-7">
        <CardTitle className="text-xl font-semibold tracking-[-0.01em]">Neues Passwort festlegen</CardTitle>
        <CardDescription>Wähle ein sicheres Passwort mit mindestens 8 Zeichen.</CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-0 sm:px-7 sm:pb-7">
        <form action={action} className="space-y-4">
          <FormMessage error={state.error} />
          <div className="space-y-2">
            <Label htmlFor="passwort">Neues Passwort</Label>
            <Input
              id="passwort"
              name="passwort"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
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
          <SubmitButton className="w-full">Passwort speichern</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
