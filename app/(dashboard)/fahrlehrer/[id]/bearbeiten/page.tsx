import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import { BenutzerForm } from "../../benutzer-form";
import type { Benutzerrolle, Fahrlehrer } from "@/lib/types";

export const metadata = { title: "Benutzer bearbeiten · FahrschulApp" };

export default async function BenutzerBearbeitenPage({ params }: { params: { id: string } }) {
  const kontext = await getKontext();
  if (kontext?.fahrlehrer?.rolle !== "chef") {
    redirect("/dashboard");
  }

  const supabase = createClient();
  const [benutzerRes, rollenRes] = await Promise.all([
    supabase.from("fahrlehrer").select("*").eq("id", params.id).maybeSingle(),
    supabase.from("benutzerrolle").select("*").order("name"),
  ]);

  if (!benutzerRes.data) {
    notFound();
  }

  const benutzer = benutzerRes.data as Fahrlehrer;
  const rollen = (rollenRes.data ?? []) as Benutzerrolle[];
  const istSelbst = Boolean(benutzer.user_id && benutzer.user_id === kontext.userId);

  return <BenutzerForm benutzer={benutzer} istSelbst={istSelbst} rollen={rollen} />;
}
