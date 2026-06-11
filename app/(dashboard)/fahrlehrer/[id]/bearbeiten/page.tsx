import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import { BenutzerForm } from "../../benutzer-form";
import type { Fahrlehrer } from "@/lib/types";

export const metadata = { title: "Benutzer bearbeiten · FahrschulApp" };

export default async function BenutzerBearbeitenPage({ params }: { params: { id: string } }) {
  const kontext = await getKontext();
  if (kontext?.fahrlehrer?.rolle !== "chef") {
    redirect("/dashboard");
  }

  const supabase = createClient();
  const { data } = await supabase
    .from("fahrlehrer")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!data) {
    notFound();
  }

  const benutzer = data as Fahrlehrer;
  const istSelbst = Boolean(benutzer.user_id && benutzer.user_id === kontext.userId);

  return <BenutzerForm benutzer={benutzer} istSelbst={istSelbst} />;
}
