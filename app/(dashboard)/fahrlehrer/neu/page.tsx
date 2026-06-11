import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import { BenutzerForm } from "../benutzer-form";
import type { Benutzerrolle } from "@/lib/types";

export const metadata = { title: "Neuer Benutzer · FahrschulApp" };

export default async function NeuerBenutzerPage() {
  const kontext = await getKontext();
  if (kontext?.fahrlehrer?.rolle !== "chef") {
    redirect("/dashboard");
  }

  const supabase = createClient();
  const { data } = await supabase.from("benutzerrolle").select("*").order("name");
  const rollen = (data ?? []) as Benutzerrolle[];

  return <BenutzerForm rollen={rollen} />;
}
