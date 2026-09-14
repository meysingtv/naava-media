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
    <Card className="shadow-md">
      <CardHeader className="p-8 pb-4">
        <CardTitle className="text-xl">Fahrschule einrichten</CardTitle>
        <CardDescription>
          Nur noch ein Schritt: Lege deinen Betrieb an. Du bist damit automatisch als
          Geschäftsführer eingetragen.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-8 pt-0">
        <SetupForm defaultEmail={kontext.email ?? undefined} />
      </CardContent>
    </Card>
  );
}
