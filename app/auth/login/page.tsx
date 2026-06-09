import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormMessage } from "@/components/shared/form-message";
import { LoginForm } from "./login-form";

export const metadata = { title: "Anmelden · FahrschulApp" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { weiter?: string; fehler?: string };
}) {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">Willkommen zurück</CardTitle>
        <CardDescription>Melde dich an, um deine Fahrschule zu verwalten.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {searchParams.fehler === "bestaetigung" && (
          <FormMessage error="Der Bestätigungslink ist ungültig oder abgelaufen. Bitte melde dich an oder fordere einen neuen Link an." />
        )}
        <LoginForm weiter={searchParams.weiter} />
        <p className="text-center text-sm text-muted-foreground">
          Noch kein Konto?{" "}
          <Link href="/auth/registrieren" className="font-medium text-primary hover:underline">
            Jetzt registrieren
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
