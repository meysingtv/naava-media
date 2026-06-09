import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Registrieren · FahrschulApp" };

export default function RegistrierenPage() {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">Konto erstellen</CardTitle>
        <CardDescription>
          Starte in wenigen Minuten mit der digitalen Verwaltung deiner Fahrschule.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
