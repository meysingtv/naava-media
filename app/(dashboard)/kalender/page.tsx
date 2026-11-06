import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import { heuteBerlin, plusTage } from "@/lib/zeit";
import { PageHeader } from "@/components/shared/page-header";
import type { Fahrlehrer, Fahrschueler, FahrstundeMitRelationen, Fahrzeug, Pruefung } from "@/lib/types";
import { Terminplaner } from "./terminplaner";
import { TerminVorschlag } from "./smart-vorschlag";
import { AnfragenDialog, type AnfrageMitNamen } from "./anfragen-dialog";

export const metadata = { title: "Kalender · FahrschulApp" };


type PruefRow = Pick<Pruefung, "id" | "datum" | "uhrzeit" | "art" | "pruefstelle"> & {
  fahrschueler: Pick<Fahrschueler, "vorname" | "nachname"> | null;
};

export default async function DispositionPage({ searchParams }: { searchParams: { datum?: string; anfragen?: string } }) {
  const supabase = createClient();
  const heute = heuteBerlin();
  const startDatum = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.datum ?? "") ? searchParams.datum : undefined;
  const von = plusTage(heute, -21);
  const bis = plusTage(heute, 60);

  const selectStunden =
    "*, fahrschueler(id, vorname, nachname, avatar_farbe), fahrlehrer(id, vorname, nachname), fahrzeug(id, kennzeichen)";

  const [schuelerRes, lehrerRes, fahrzeugRes, stundenRes, pruefRes, anfragenRes, kontext] = await Promise.all([
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
    // Offene Anfragen aus dem Schüler-Portal – ohne Migration 0020 einfach leer.
    supabase
      .from("fahrstunde_anfrage")
      .select("*, fahrschueler(id, vorname, nachname), wunsch:fahrlehrer!wunsch_fahrlehrer_id(id, vorname, nachname)")
      .eq("status", "offen")
      .order("datum", { ascending: true })
      .order("uhrzeit", { ascending: true })
      .returns<AnfrageMitNamen[]>(),
    getKontext(),
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

  const belegung = (stundenRes.data ?? [])
    .filter((s) => s.status !== "ausgefallen")
    .map((s) => ({
      fahrlehrerId: s.fahrlehrer_id,
      fahrzeugId: s.fahrzeug_id,
      datum: s.datum,
      uhrzeit: s.uhrzeit,
      dauer: s.dauer_minuten,
      schueler: s.fahrschueler ? `${s.fahrschueler.vorname} ${s.fahrschueler.nachname}` : "ohne Schüler",
    }));

  return (
    <div>
      <PageHeader title="Kalender">
        <AnfragenDialog
          anfragen={anfragenRes.error ? [] : anfragenRes.data ?? []}
          fahrlehrer={options.fahrlehrer.map((f) => ({ value: f.id, label: f.label }))}
          fahrzeuge={options.fahrzeuge.map((f) => ({ value: f.id, label: f.label }))}
          belegung={belegung}
          ichId={kontext?.fahrlehrer?.id ?? null}
          startOffen={searchParams.anfragen === "1"}
        />
        <TerminVorschlag schueler={options.schueler} />
      </PageHeader>
      <Terminplaner heute={heute} startDatum={startDatum} stunden={stundenRes.data ?? []} options={options} pruefungen={pruefungen} />
    </div>
  );
}
