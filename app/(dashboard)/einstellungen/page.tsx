import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import { PageHeader } from "@/components/shared/page-header";
import type { Leistung } from "@/lib/types";
import { EinstellungenForm } from "./einstellungen-form";
import { Preisliste } from "./preisliste";

export const metadata = { title: "Einstellungen · FahrschulApp" };

export default async function EinstellungenPage() {
  const kontext = await getKontext();

  if (!kontext?.fahrschule) {
    redirect("/auth/login");
  }
  // Nur der Chef darf das Firmenprofil bearbeiten.
  if (kontext.fahrlehrer?.rolle !== "chef") {
    redirect("/dashboard");
  }

  const supabase = createClient();
  const { data: leistungen } = await supabase
    .from("leistung")
    .select("*")
    .order("sortierung", { ascending: true })
    .order("name", { ascending: true })
    .returns<Leistung[]>();

  return (
    <div className="space-y-6">
      <PageHeader title="Einstellungen" description="Verwalte das Profil deiner Fahrschule." />
      <div className="max-w-3xl space-y-6">
        <EinstellungenForm fahrschule={kontext.fahrschule} />
        <Preisliste leistungen={leistungen ?? []} />
      </div>
    </div>
  );
}
