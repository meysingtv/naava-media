import Link from "next/link";

import { FormMessage } from "@/components/shared/form-message";
import { AuthKopf } from "../auth-kopf";
import { LoginForm } from "./login-form";

export const metadata = { title: "Anmelden · FahrschulApp" };

export default function LoginPage({ searchParams }: { searchParams: { weiter?: string; fehler?: string } }) {
  return (
    <>
      <AuthKopf titel="Willkommen zurück" text="Melde dich an, um deine Fahrschule zu verwalten." />
      {searchParams.fehler === "bestaetigung" && (
        <div className="mb-5">
          <FormMessage error="Der Bestätigungslink ist ungültig oder abgelaufen. Bitte melde dich an oder fordere einen neuen Link an." />
        </div>
      )}
      <LoginForm weiter={searchParams.weiter} />
      <p className="mt-8 text-13 text-foreground-secondary">
        Noch kein Konto?{" "}
        <Link href="/auth/registrieren" className="font-medium text-primary-text hover:underline">
          Jetzt kostenlos registrieren
        </Link>
      </p>
    </>
  );
}
