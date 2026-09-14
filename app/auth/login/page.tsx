import Link from "next/link";
import { LogIn } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { FormMessage } from "@/components/shared/form-message";
import { LoginForm } from "./login-form";

export const metadata = { title: "Anmelden · FahrschulApp" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { weiter?: string; fehler?: string };
}) {
  return (
    <Card className="shadow-md">
      <CardContent className="space-y-6 p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <LogIn className="h-6 w-6" strokeWidth={1.75} />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Willkommen zurück</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Melde dich an, um deine Fahrschule zu verwalten.
            </p>
          </div>
        </div>

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
