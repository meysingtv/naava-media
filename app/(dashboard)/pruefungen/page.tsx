import { ClipboardCheck } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { KpiCard, KpiRow } from "@/components/ui/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { FUEHRERSCHEINKLASSEN } from "@/lib/constants";
import { formatDatum } from "@/lib/utils";
import { heuteBerlin } from "@/lib/zeit";
import type { Fahrschueler, PruefungMitSchueler } from "@/lib/types";
import { PruefungNeu } from "./pruefung-neu";
import { PruefungenListe } from "./pruefungen-liste";

export const metadata = { title: "Prüfungen · FahrschulApp" };

/** „83 %" und „5 von 6 bestanden" – oder ein Strich, wenn es noch keine Ergebnisse gibt. */
function quote(liste: PruefungMitSchueler[]) {
  const fertig = liste.filter((p) => p.ergebnis !== "offen");
  const bestanden = fertig.filter((p) => p.ergebnis === "bestanden").length;
  return {
    wert: fertig.length ? `${Math.round((bestanden / fertig.length) * 100)} %` : "—",
    sub: fertig.length ? `${bestanden} von ${fertig.length} bestanden` : "Noch keine Ergebnisse",
  };
}

export default async function PruefungenPage() {
  const supabase = createClient();
  const heute = heuteBerlin();

  const [pruefungenRes, schuelerRes] = await Promise.all([
    supabase
      .from("pruefung")
      .select("*, fahrschueler(id, vorname, nachname, avatar_farbe)")
      .order("datum", { ascending: false })
      .returns<PruefungMitSchueler[]>(),
    supabase
      .from("fahrschueler")
      .select("id, vorname, nachname, fuehrerscheinklassen")
      .order("nachname")
      .returns<Pick<Fahrschueler, "id" | "vorname" | "nachname" | "fuehrerscheinklassen">[]>(),
  ]);

  const pruefungen = pruefungenRes.data ?? [];
  const anstehend = pruefungen.filter((p) => p.ergebnis === "offen" && p.datum >= heute).sort((a, b) => a.datum.localeCompare(b.datum));
  const naechste = anstehend[0];
  const gesamt = quote(pruefungen);
  const theorie = quote(pruefungen.filter((p) => p.art === "theorie"));
  const praxis = quote(pruefungen.filter((p) => p.art === "praxis"));

  const schueler = (schuelerRes.data ?? []).map((s) => ({
    id: s.id,
    label: `${s.vorname} ${s.nachname}`,
    klasse: s.fuehrerscheinklassen?.[0] ?? "",
  }));

  return (
    <div>
      <PageHeader title="Prüfungen">
        <PruefungNeu schueler={schueler} klassen={[...FUEHRERSCHEINKLASSEN]} />
      </PageHeader>

      {pruefungen.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Noch keine Prüfungen"
          description="Trag die erste Theorie- oder Praxisprüfung ein. Ergebnisse erfasst du danach mit einem Klick."
        >
          <PruefungNeu schueler={schueler} klassen={[...FUEHRERSCHEINKLASSEN]} />
        </EmptyState>
      ) : (
        <div className="space-y-6">
          <KpiRow>
            <KpiCard
              label="Anstehend"
              value={anstehend.length}
              sub={
                naechste?.fahrschueler
                  ? `Nächste: ${naechste.fahrschueler.vorname} ${naechste.fahrschueler.nachname}, ${formatDatum(naechste.datum)}`
                  : naechste
                    ? `Nächste am ${formatDatum(naechste.datum)}`
                    : "Keine geplant"
              }
            />
            <KpiCard label="Bestehensquote" value={gesamt.wert} sub={gesamt.sub} />
            <KpiCard label="Theorieprüfung" value={theorie.wert} sub={theorie.sub} />
            <KpiCard label="Praktische Prüfung" value={praxis.wert} sub={praxis.sub} />
          </KpiRow>

          <PruefungenListe pruefungen={pruefungen} heute={heute} />
        </div>
      )}
    </div>
  );
}
