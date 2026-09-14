import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Registrieren · FahrschulApp" };

export default function RegistrierenPage() {
  return (
    <Card className="shadow-md">
      <CardHeader className="p-8 pb-4">
        <CardTitle className="text-xl">Konto erstellen</CardTitle>
        <CardDescription>
          Starte in wenigen Minuten mit der digitalen Verwaltung deiner Fahrschule.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-8 pt-0">
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
