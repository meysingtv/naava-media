import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import type { Fahrlehrer, Fahrschueler, FahrstundeMitRelationen, Fahrzeug, Pruefung } from "@/lib/types";
import { Terminplaner } from "./terminplaner";
import { SmartVorschlag } from "./smart-vorschlag";

export const metadata = { title: "Disposition · FahrschulApp" };

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addTage(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return iso(d);
}

type PruefRow = Pick<Pruefung, "id" | "datum" | "uhrzeit" | "art" | "pruefstelle"> & {
  fahrschueler: Pick<Fahrschueler, "vorname" | "nachname"> | null;
};

export default async function DispositionPage({ searchParams }: { searchParams: { datum?: string } }) {
  const supabase = createClient();
  const heute = iso(new Date());
  const startDatum = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.datum ?? "") ? searchParams.datum : undefined;
  const von = addTage(-21);
  const bis = addTage(60);

  const selectStunden =
    "*, fahrschueler(id, vorname, nachname, avatar_farbe), fahrlehrer(id, vorname, nachname), fahrzeug(id, kennzeichen)";

  const [schuelerRes, lehrerRes, fahrzeugRes, stundenRes, pruefRes] = await Promise.all([
    supabase.from("fahrschueler").select("id, vorname, nachname").order("nachname").returns<Pick<Fahrschueler, "id" | "vorname" | "nachname">[]>(),
    supabase.from("fahrlehrer").select("id, vorname, nachname").eq("aktiv", true).order("nachname").returns<Pick<Fahrlehrer, "id" | "vorname" | "nachname">[]>(),
    supabase.from("fahrzeug").select("id, kennzeichen").eq("aktiv", true).order("kennzeichen").returns<Pick<Fahrzeug, "id" | "kennzeichen">[]>(),
    supabase
      .from("fahrstunde")
      .select(selectStunden)
      .gte("datum", von)
      .lte("datum", bis)
      .order("uhrzeit", { ascending: true })
      .returns<FahrstundeMitRelationen[]>(),
    supabase
      .from("pruefung")
      .select("id, datum, uhrzeit, art, pruefstelle, fahrschueler(vorname, nachname)")
      .gte("datum", von)
      .lte("datum", bis)
      .returns<PruefRow[]>(),
  ]);

  const options = {
    schueler: (schuelerRes.data ?? []).map((s) => ({ id: s.id, label: `${s.vorname} ${s.nachname}` })),
    fahrlehrer: (lehrerRes.data ?? []).map((f) => ({ id: f.id, label: `${f.vorname} ${f.nachname}` })),
    fahrzeuge: (fahrzeugRes.data ?? []).map((f) => ({ id: f.id, label: f.kennzeichen })),
  };

  const pruefungen = (pruefRes.data ?? []).map((p) => ({
    id: p.id,
    datum: p.datum,
    uhrzeit: p.uhrzeit,
    art: p.art,
    pruefstelle: p.pruefstelle,
    schueler: p.fahrschueler ? `${p.fahrschueler.vorname} ${p.fahrschueler.nachname}` : null,
  }));

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Termine" title="Disposition" description="Wer fährt wann mit wem – Fahrlehrer und Fahrzeuge im Einsatz.">
        <SmartVorschlag schueler={options.schueler} />
      </PageHeader>
      <Terminplaner heute={heute} startDatum={startDatum} stunden={stundenRes.data ?? []} options={options} pruefungen={pruefungen} />
    </div>
  );
}
