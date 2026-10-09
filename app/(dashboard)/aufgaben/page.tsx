import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { heuteBerlin } from "@/lib/zeit";
import type { Fahrschueler } from "@/lib/types";
import { AufgabeNeu } from "./aufgabe-neu";
import { AufgabenListe, type AufgabeMitSchueler } from "./aufgaben-liste";

export const metadata = { title: "Aufgaben · FahrschulApp" };

export default async function AufgabenPage() {
  const supabase = createClient();

  const [aufgabenRes, schuelerRes] = await Promise.all([
    supabase
      .from("aufgabe")
      .select("*, fahrschueler(id, vorname, nachname)")
      .order("faellig_am", { ascending: true, nullsFirst: false })
      .returns<AufgabeMitSchueler[]>(),
    supabase
      .from("fahrschueler")
      .select("id, vorname, nachname")
      .order("nachname")
      .returns<Pick<Fahrschueler, "id" | "vorname" | "nachname">[]>(),
  ]);

  const schueler = (schuelerRes.data ?? []).map((s) => ({ id: s.id, label: `${s.vorname} ${s.nachname}` }));

  return (
    <div>
      <PageHeader title="Aufgaben">
        <AufgabeNeu schueler={schueler} />
      </PageHeader>

      <AufgabenListe aufgaben={aufgabenRes.data ?? []} heute={heuteBerlin()} />
    </div>
  );
}
