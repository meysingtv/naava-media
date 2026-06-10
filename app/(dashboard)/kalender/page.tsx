import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import type { Fahrlehrer, Fahrschueler, FahrstundeMitRelationen, Fahrzeug } from "@/lib/types";
import { Terminplaner } from "./terminplaner";

export const metadata = { title: "Terminplaner · FahrschulApp" };

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addTage(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return iso(d);
}

export default async function TerminplanerPage() {
  const supabase = createClient();
  const heute = iso(new Date());

  const selectStunden =
    "*, fahrschueler(id, vorname, nachname, avatar_farbe), fahrlehrer(id, vorname, nachname), fahrzeug(id, kennzeichen)";

  const [schuelerRes, lehrerRes, fahrzeugRes, stundenRes] = await Promise.all([
    supabase.from("fahrschueler").select("*").order("nachname").returns<Fahrschueler[]>(),
    supabase.from("fahrlehrer").select("*").eq("aktiv", true).order("nachname").returns<Fahrlehrer[]>(),
    supabase.from("fahrzeug").select("*").eq("aktiv", true).order("kennzeichen").returns<Fahrzeug[]>(),
    supabase
      .from("fahrstunde")
      .select(selectStunden)
      .gte("datum", addTage(-21))
      .lte("datum", addTage(60))
      .order("uhrzeit", { ascending: true })
      .returns<FahrstundeMitRelationen[]>(),
  ]);

  const options = {
    schueler: (schuelerRes.data ?? []).map((s) => ({ id: s.id, label: `${s.vorname} ${s.nachname}` })),
    fahrlehrer: (lehrerRes.data ?? []).map((f) => ({ id: f.id, label: `${f.vorname} ${f.nachname}` })),
    fahrzeuge: (fahrzeugRes.data ?? []).map((f) => ({ id: f.id, label: f.kennzeichen })),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Terminplaner"
        description="Alle Fahrstunden im Zeitraster – wie in der App."
      />
      <Terminplaner heute={heute} stunden={stundenRes.data ?? []} options={options} />
    </div>
  );
}
