import { Landmark } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { KpiCard, KpiRow } from "@/components/ui/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { formatEuro } from "@/lib/utils";
import type { Fahrschueler, Rechnung } from "@/lib/types";
import { KostentraegerListe, type KostentraegerZeile } from "./kostentraeger-liste";

export const metadata = { title: "Kostenträger · FahrschulApp" };

export default async function KostentraegerPage() {
  const supabase = createClient();

  const [schuelerRes, rechnungRes] = await Promise.all([
    supabase
      .from("fahrschueler")
      .select("id, kostentraeger, kostentraeger_email")
      .returns<Pick<Fahrschueler, "id" | "kostentraeger" | "kostentraeger_email">[]>(),
    supabase.from("rechnung").select("schueler_id, betrag_brutto, status").returns<
      Pick<Rechnung, "schueler_id" | "betrag_brutto" | "status">[]
    >(),
  ]);

  const schueler = schuelerRes.data ?? [];
  const rechnungen = rechnungRes.data ?? [];

  // Beträge je Schüler
  const gesamtProSchueler: Record<string, number> = {};
  const offenProSchueler: Record<string, number> = {};
  for (const r of rechnungen) {
    if (!r.schueler_id) continue;
    gesamtProSchueler[r.schueler_id] = (gesamtProSchueler[r.schueler_id] ?? 0) + Number(r.betrag_brutto ?? 0);
    if (r.status !== "bezahlt")
      offenProSchueler[r.schueler_id] = (offenProSchueler[r.schueler_id] ?? 0) + Number(r.betrag_brutto ?? 0);
  }

  // Nach Kostenträger gruppieren (nur Schüler mit gesetztem Kostenträger)
  const map = new Map<string, KostentraegerZeile>();
  for (const s of schueler) {
    const name = s.kostentraeger?.trim();
    if (!name) continue;
    const z = map.get(name) ?? { name, email: s.kostentraeger_email, anzahl: 0, gesamt: 0, offen: 0 };
    z.anzahl += 1;
    z.gesamt += gesamtProSchueler[s.id] ?? 0;
    z.offen += offenProSchueler[s.id] ?? 0;
    if (!z.email && s.kostentraeger_email) z.email = s.kostentraeger_email;
    map.set(name, z);
  }
  const zeilen = Array.from(map.values()).sort((a, b) => b.offen - a.offen || b.gesamt - a.gesamt);

  const summeOffen = zeilen.reduce((s, z) => s + z.offen, 0);
  const summeGesamt = zeilen.reduce((s, z) => s + z.gesamt, 0);
  const anzahlSchueler = zeilen.reduce((s, z) => s + z.anzahl, 0);
  const mitOffen = zeilen.filter((z) => z.offen > 0).length;

  return (
    <div>
      <PageHeader title="Kostenträger" />

      {zeilen.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="Noch keine Kostenträger"
          description="Trag beim Schüler unter „Zahlung“ einen Kostenträger ein, etwa das Jobcenter oder die Agentur für Arbeit. Dann erscheint er hier zur Sammelabrechnung."
        />
      ) : (
        <div className="space-y-6">
          <KpiRow cols={3}>
            <KpiCard label="Kostenträger" value={zeilen.length} sub={`${anzahlSchueler} geförderte Schüler`} />
            <KpiCard
              label="Offen bei Kostenträgern"
              value={formatEuro(summeOffen)}
              sub={mitOffen ? `bei ${mitOffen} ${mitOffen === 1 ? "Kostenträger" : "Kostenträgern"}` : "Alles beglichen"}
              tone={summeOffen > 0 ? "warning" : "neutral"}
            />
            <KpiCard label="Abgerechnet gesamt" value={formatEuro(summeGesamt)} sub="alle Rechnungen geförderter Schüler" />
          </KpiRow>

          <KostentraegerListe zeilen={zeilen} />
        </div>
      )}
    </div>
  );
}
