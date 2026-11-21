import { Wallet } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { KpiCard, KpiRow } from "@/components/ui/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { formatEuro } from "@/lib/utils";
import { heuteBerlin } from "@/lib/zeit";
import type { Fahrschueler, Rechnung } from "@/lib/types";
import { ZahlungNeu, type OffeneRechnung } from "./zahlung-neu";
import { ZahlungenListe, type ZahlungRow } from "./zahlungen-liste";

export const metadata = { title: "Zahlungen · FahrschulApp" };

type OffeneRow = Pick<Rechnung, "id" | "nummer" | "betrag_brutto" | "schueler_id"> & {
  fahrschueler: Pick<Fahrschueler, "vorname" | "nachname"> | null;
};

export default async function ZahlungenPage() {
  const supabase = createClient();
  const heute = heuteBerlin();
  const jahr = heute.slice(0, 4);
  const monat = heute.slice(0, 7);

  const [zahlungRes, schuelerRes, offeneRes] = await Promise.all([
    supabase
      .from("zahlung")
      .select("*, fahrschueler(id, vorname, nachname), rechnung(id, nummer)")
      .order("datum", { ascending: false })
      .order("created_at", { ascending: false })
      .returns<ZahlungRow[]>(),
    supabase
      .from("fahrschueler")
      .select("id, vorname, nachname")
      .order("nachname")
      .returns<Pick<Fahrschueler, "id" | "vorname" | "nachname">[]>(),
    supabase
      .from("rechnung")
      .select("id, nummer, betrag_brutto, schueler_id, fahrschueler(vorname, nachname)")
      .neq("status", "bezahlt")
      .order("rechnungsdatum", { ascending: true })
      .returns<OffeneRow[]>(),
  ]);

  const zahlungen = zahlungRes.data ?? [];
  const summe = (liste: ZahlungRow[]) => liste.reduce((s, z) => s + Number(z.betrag ?? 0), 0);
  const imMonat = zahlungen.filter((z) => (z.datum ?? "").startsWith(monat));
  const imJahr = zahlungen.filter((z) => (z.datum ?? "").startsWith(jahr));
  const ohneRechnung = zahlungen.filter((z) => !z.rechnung_id);

  const offene = offeneRes.data ?? [];
  const offenerBetrag = offene.reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0);

  const schueler = (schuelerRes.data ?? []).map((s) => ({ id: s.id, label: `${s.vorname} ${s.nachname}` }));
  const offeneOpts: OffeneRechnung[] = offene.map((r) => ({
    id: r.id,
    nummer: r.nummer,
    betrag: Number(r.betrag_brutto ?? 0),
    schueler_id: r.schueler_id,
    schueler: r.fahrschueler ? `${r.fahrschueler.vorname} ${r.fahrschueler.nachname}` : "—",
  }));
  return (
    <div>
      <PageHeader title="Zahlungen">
        <ZahlungNeu schueler={schueler} offene={offeneOpts} />
      </PageHeader>

      {zahlungen.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Noch keine Zahlungen erfasst"
          description="Buche den ersten Zahlungseingang und ordne ihn direkt einer offenen Rechnung zu – sie gilt dann als bezahlt."
        >
          <ZahlungNeu schueler={schueler} offene={offeneOpts} />
        </EmptyState>
      ) : (
        <div className="space-y-6">
          <KpiRow>
            <KpiCard label="Eingänge diesen Monat" value={formatEuro(summe(imMonat))} sub={`${imMonat.length} Zahlungen`} />
            <KpiCard label={`Eingänge ${jahr}`} value={formatEuro(summe(imJahr))} sub={`${imJahr.length} Zahlungen`} />
            <KpiCard
              label="Noch offen"
              value={formatEuro(offenerBetrag)}
              sub={`${offene.length} ${offene.length === 1 ? "Rechnung" : "Rechnungen"}`}
              tone={offene.length ? "warning" : "neutral"}
              href="/rechnungen"
            />
            <KpiCard
              label="Ohne Rechnung"
              value={ohneRechnung.length}
              sub={ohneRechnung.length ? `${formatEuro(summe(ohneRechnung))} nicht zugeordnet` : "Alles zugeordnet"}
            />
          </KpiRow>

          <ZahlungenListe zahlungen={zahlungen} />
        </div>
      )}
    </div>
  );
}
