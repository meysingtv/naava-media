"use client";

import Link from "next/link";
import { useFormState } from "react-dom";

import { passwortVergessen, type FormState } from "@/app/auth/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormMessage } from "@/components/shared/form-message";

const initial: FormState = {};

export default function PasswortVergessenPage() {
  const [state, action] = useFormState(passwortVergessen, initial);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">Passwort vergessen?</CardTitle>
        <CardDescription>
          Gib deine E-Mail-Adresse ein – wir senden dir einen Link zum Zurücksetzen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {state.message ? (
          <FormMessage message={state.message} />
        ) : (
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
            <SubmitButton className="w-full">Link anfordern</SubmitButton>
          </form>
        )}
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/auth/login" className="font-medium text-primary hover:underline">
            Zurück zur Anmeldung
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
