import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getKontext } from "@/lib/supabase/queries";
import { SetupForm } from "./setup-form";

export const metadata = { title: "Fahrschule einrichten · FahrschulApp" };

export default async function SetupPage() {
  const kontext = await getKontext();

  if (!kontext) {
    redirect("/auth/login");
  }
  // Bereits eingerichtet → direkt ins Dashboard.
  if (kontext.fahrlehrer) {
    redirect("/dashboard");
  }

  return (
    <Card>
      <CardHeader className="px-6 pb-3 pt-6 sm:px-7 sm:pt-7">
        <CardTitle className="text-xl font-semibold tracking-[-0.01em]">Fahrschule einrichten</CardTitle>
        <CardDescription>
          Nur noch ein Schritt: Lege deinen Betrieb an. Du bist damit automatisch als
          Geschäftsführer eingetragen.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-0 sm:px-7 sm:pb-7">
        <SetupForm defaultEmail={kontext.email ?? undefined} />
      </CardContent>
    </Card>
  );
}
