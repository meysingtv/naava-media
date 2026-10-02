import { redirect } from "next/navigation";

import { getKontext } from "@/lib/supabase/queries";
import { AuthKopf } from "../auth-kopf";
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
    <>
      <AuthKopf titel="Fahrschule einrichten" text="Noch ein Schritt: Lege deine Fahrschule an. Du bist dann automatisch als Geschäftsführer eingetragen." />
      <SetupForm defaultEmail={kontext.email ?? undefined} />
    </>
  );
}
