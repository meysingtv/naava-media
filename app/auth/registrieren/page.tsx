import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Registrieren · FahrschulApp" };

export default function RegistrierenPage() {
  return (
    <Card>
      <CardHeader className="px-6 pb-3 pt-6 sm:px-7 sm:pt-7">
        <CardTitle className="text-xl font-semibold tracking-[-0.01em]">Konto erstellen</CardTitle>
        <CardDescription>
          Starte in wenigen Minuten mit der digitalen Verwaltung deiner Fahrschule.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-6 pb-6 pt-0 sm:px-7 sm:pb-7">
        <RegisterForm />
        <p className="text-center text-sm text-muted-foreground">
          Bereits registriert?{" "}
          <Link href="/auth/login" className="font-medium text-primary hover:underline">
            Zur Anmeldung
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
