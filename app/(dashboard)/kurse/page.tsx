import { GraduationCap } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { KpiCard, KpiRow } from "@/components/ui/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { FUEHRERSCHEINKLASSEN } from "@/lib/constants";
import { formatDatum } from "@/lib/utils";
import { heuteBerlin } from "@/lib/zeit";
import { KursNeu } from "./kurs-neu";
import { KurseListe, type KursZeile } from "./kurse-liste";

export const metadata = { title: "Kurse · FahrschulApp" };

export default async function KursePage() {
  const supabase = createClient();
  const heute = heuteBerlin();

  const [kursRes, stundenRes] = await Promise.all([
    supabase
      .from("kurs")
      .select("*, kurs_teilnahme(count)")
      .order("created_at", { ascending: false })
      .returns<Omit<KursZeile, "stunden" | "naechste">[]>(),
    supabase
      .from("theoriestunde")
      .select("kurs_id, datum")
      .returns<{ kurs_id: string | null; datum: string }[]>(),
  ]);

  // Theorie-Einheiten je Kurs: gehalten und nächster Termin
  const stundenMap: Record<string, { gehalten: number; naechste: string | null }> = {};
  for (const s of stundenRes.data ?? []) {
    if (!s.kurs_id) continue;
    const e = (stundenMap[s.kurs_id] ??= { gehalten: 0, naechste: null });
    if (s.datum < heute) e.gehalten += 1;
    else if (!e.naechste || s.datum < e.naechste) e.naechste = s.datum;
  }

  const kurse: KursZeile[] = (kursRes.data ?? []).map((k) => ({
    ...k,
    stunden: stundenMap[k.id]?.gehalten ?? 0,
    naechste: stundenMap[k.id]?.naechste ?? null,
  }));
  const teilnehmer = (k: KursZeile) => k.kurs_teilnahme?.[0]?.count ?? 0;
  const laufend = kurse.filter((k) => k.status === "laufend");
  const geplant = kurse.filter((k) => k.status === "geplant").sort((a, b) => (a.start_datum ?? "9999").localeCompare(b.start_datum ?? "9999"));

  return (
    <div>
      <PageHeader title="Kurse">
        <KursNeu klassen={[...FUEHRERSCHEINKLASSEN]} />
      </PageHeader>

      {kurse.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Noch keine Kurse"
          description="Lege den ersten Theoriekurs an, ordne Schüler zu und verknüpfe die Theoriestunden."
        >
          <KursNeu klassen={[...FUEHRERSCHEINKLASSEN]} />
        </EmptyState>
      ) : (
        <div className="space-y-6">
          <KpiRow cols={3}>
            <KpiCard
              label="Laufende Kurse"
              value={laufend.length}
              sub={`${laufend.reduce((s, k) => s + teilnehmer(k), 0)} Teilnehmer`}
            />
            <KpiCard
              label="Geplant"
              value={geplant.length}
              sub={geplant[0]?.start_datum ? `Nächster Start ${formatDatum(geplant[0].start_datum)}` : "Kein Start geplant"}
            />
            <KpiCard label="Teilnehmer gesamt" value={kurse.reduce((s, k) => s + teilnehmer(k), 0)} sub={`in ${kurse.length} Kursen`} />
          </KpiRow>

          <KurseListe kurse={kurse} />
        </div>
      )}
    </div>
  );
}
