import { redirect } from "next/navigation";

import { getKontext } from "@/lib/supabase/queries";
import { BenutzerForm } from "../benutzer-form";

export const metadata = { title: "Neuer Benutzer · FahrschulApp" };

export default async function NeuerBenutzerPage() {
  const kontext = await getKontext();
  if (kontext?.fahrlehrer?.rolle !== "chef") {
    redirect("/dashboard");
  }
  return <BenutzerForm />;
}
