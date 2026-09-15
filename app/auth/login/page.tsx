import Link from "next/link";

import { FormMessage } from "@/components/shared/form-message";
import { LoginForm } from "./login-form";

export const metadata = { title: "Anmelden · FahrschulApp" };

export default function LoginPage({ searchParams }: { searchParams: { weiter?: string; fehler?: string } }) {
  return (
    <div className="rounded-xl border bg-card p-6 sm:p-7">
      <p className="label-caps mb-1">Anmeldung</p>
      <h1 className="text-xl font-semibold tracking-[-0.01em] text-foreground">Zurück ins Büro.</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">Melde dich an, um deine Fahrschule zu verwalten.</p>

      <div className="mt-5 space-y-4">
        {searchParams.fehler === "bestaetigung" && (
          <FormMessage error="Der Bestätigungslink ist ungültig oder abgelaufen. Bitte melde dich an oder fordere einen neuen Link an." />
        )}
        <LoginForm weiter={searchParams.weiter} />
      </div>

      <p className="mt-5 border-t pt-4 text-[13px] text-muted-foreground">
        Noch kein Konto?{" "}
        <Link href="/auth/registrieren" className="font-medium text-primary hover:text-primary-hover">
          Jetzt registrieren
        </Link>
      </p>
    </div>
  );
}
