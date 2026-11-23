import Link from "next/link";

import { AuthKopf } from "../auth-kopf";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Registrieren · FahrschulApp" };

export default function RegistrierenPage() {
  return (
    <>
      <AuthKopf titel="Konto erstellen" text="In wenigen Minuten startklar: Konto anlegen, Fahrschule einrichten, loslegen." />
      <RegisterForm />
      <p className="mt-8 text-13 text-foreground-secondary">
        Bereits registriert?{" "}
        <Link href="/auth/login" className="font-medium text-primary-text hover:underline">
          Zur Anmeldung
        </Link>
      </p>
    </>
  );
}
