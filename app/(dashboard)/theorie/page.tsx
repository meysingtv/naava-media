import { BookOpen } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { KpiCard, KpiRow } from "@/components/ui/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { formatDatum, formatUhrzeit } from "@/lib/utils";
import { heuteBerlin } from "@/lib/zeit";
import { TheoriestundeDialog } from "./theoriestunde-dialog";
import { TheorieListe, type StundeZeile } from "./theorie-liste";

export const metadata = { title: "Theorie · FahrschulApp" };

export default async function TheoriePage() {
  const supabase = createClient();
  const heute = heuteBerlin();

  const { data } = await supabase
    .from("theoriestunde")
    .select("*, teilnahme:theorie_teilnahme(count), kurs(id, name)")
    .order("datum", { ascending: false })
    .order("uhrzeit", { ascending: false })
    .returns<StundeZeile[]>();

  const stunden = data ?? [];
  const anstehend = stunden.filter((t) => t.datum >= heute).sort((a, b) => `${a.datum}${a.uhrzeit}`.localeCompare(`${b.datum}${b.uhrzeit}`));
  const naechste = anstehend[0];
  const vergangen = stunden.filter((t) => t.datum < heute);
  const imMonat = stunden.filter((t) => t.datum.startsWith(heute.slice(0, 7)));
  const anwesend = vergangen.reduce((s, t) => s + (t.teilnahme?.[0]?.count ?? 0), 0);
  const plaetze = vergangen.reduce((s, t) => s + (t.max_teilnehmer ?? 0), 0);
  const schnitt = vergangen.length ? anwesend / vergangen.length : 0;
  const monatName = new Date(`${heute}T12:00:00Z`).toLocaleDateString("de-DE", { month: "long", timeZone: "UTC" });

  return (
    <div>
      <PageHeader title="Theorie">
        <TheoriestundeDialog />
      </PageHeader>

      {stunden.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Noch keine Theoriestunden"
          description="Plane den ersten Termin für den Theorieunterricht. Die Anwesenheit trägst du danach mit einem Klick je Schüler ein."
        >
          <TheoriestundeDialog />
        </EmptyState>
      ) : (
        <div className="space-y-6">
          <KpiRow>
            <KpiCard
              label="Nächste Stunde"
              value={naechste ? (naechste.datum === heute ? "Heute" : formatDatum(naechste.datum)) : "—"}
              sub={naechste ? `${formatUhrzeit(naechste.uhrzeit)} Uhr${naechste.thema ? ` · ${naechste.thema}` : ""}` : "Keine geplant"}
            />
            <KpiCard label={`Im ${monatName}`} value={imMonat.length} sub={`${anstehend.length} noch anstehend`} />
            <KpiCard
              label="Ø Teilnehmer"
              value={schnitt.toLocaleString("de-DE", { maximumFractionDigits: 1 })}
              sub={vergangen.length ? `aus ${vergangen.length} vergangenen Stunden` : "Noch keine Stunde gehalten"}
            />
            <KpiCard
              label="Auslastung"
              value={plaetze ? `${Math.round((anwesend / plaetze) * 100)} %` : "—"}
              sub={plaetze ? `${anwesend} von ${plaetze} Plätzen belegt` : "Keine Platzangaben"}
            />
          </KpiRow>

          <TheorieListe stunden={stunden} heute={heute} />
        </div>
      )}
    </div>
  );
}
