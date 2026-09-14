import { GraduationCap } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { PortalLoginForm } from "./login-form";

export const metadata = { title: "Schüler-Login" };

export default function PortalLoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(60%_100%_at_50%_0%,hsl(var(--primary-soft))_0%,transparent_100%)]"
      />
      <div className="relative mb-6 flex flex-col items-center gap-2 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <GraduationCap className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Mein Fahrschul-Portal</h1>
          <p className="text-sm text-muted-foreground">Termine, Fortschritt & Rechnungen an einem Ort.</p>
        </div>
      </div>

      <Card className="relative w-full max-w-[400px] shadow-md">
        <CardContent className="p-6">
          <PortalLoginForm />
        </CardContent>
      </Card>

      <p className="relative mt-6 max-w-[360px] text-center text-xs text-muted-foreground">
        Den Zugangscode bekommst du von deiner Fahrschule. Probleme? Melde dich einfach im Büro.
      </p>
    </div>
  );
}
