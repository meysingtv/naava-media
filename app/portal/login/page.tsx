import { GraduationCap } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { PortalLoginForm } from "./login-form";

export const metadata = { title: "Schüler-Login" };

export default function PortalLoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10">
      <div className="relative mb-6 flex flex-col items-center gap-2 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-foreground text-primary">
          <GraduationCap className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Mein Fahrschul-Portal</h1>
          <p className="text-sm text-muted-foreground">Termine, Fortschritt & Rechnungen an einem Ort.</p>
        </div>
      </div>

      <Card className="relative w-full max-w-[400px]">
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
