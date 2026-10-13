import Link from "next/link";
import { Plus, Receipt } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { KpiCard, KpiRow } from "@/components/ui/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { formatEuro } from "@/lib/utils";
import type { RechnungMitSchueler } from "@/lib/types";
import { RechnungenTabelle } from "./rechnungen-tabelle";

export const metadata = { title: "Rechnungen · FahrschulApp" };

export default async function RechnungenPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("rechnung")
    .select("*, fahrschueler(id, vorname, nachname)")
    .order("rechnungsdatum", { ascending: false })
    .returns<RechnungMitSchueler[]>();

  const rechnungen = data ?? [];
  const heute = new Date().toISOString().slice(0, 10);
  const monatsbeginn = `${heute.slice(0, 7)}-01`;
  const summe = (liste: RechnungMitSchueler[]) => liste.reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0);

  const offen = rechnungen.filter((r) => r.status !== "bezahlt");
  const ueberfaellig = offen.filter((r) => r.status === "ueberfaellig" || (r.faelligkeitsdatum && r.faelligkeitsdatum < heute));
  const bezahltMonat = rechnungen.filter((r) => r.status === "bezahlt" && (r.bezahlt_am ?? "") >= monatsbeginn);
  const gestelltMonat = rechnungen.filter((r) => r.rechnungsdatum >= monatsbeginn);

  return (
    <div>
      <PageHeader title="Rechnungen">
        <Button asChild size="sm">
          <Link href="/rechnungen/neu">
            <Plus /> Rechnung schreiben
          </Link>
        </Button>
      </PageHeader>

      {rechnungen.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Noch keine Rechnungen"
          description="Schreib die erste Rechnung mit Positionen und Mehrwertsteuer."
        >
          <Button asChild size="sm">
            <Link href="/rechnungen/neu">
              <Plus /> Rechnung schreiben
            </Link>
          </Button>
        </EmptyState>
      ) : (
        <div className="space-y-6">
          <KpiRow>
            <KpiCard label="Offen" value={formatEuro(summe(offen))} sub={`${offen.length} Rechnungen`} />
            <KpiCard
              label="Überfällig"
              value={formatEuro(summe(ueberfaellig))}
              sub={`${ueberfaellig.length} Rechnungen`}
              tone={ueberfaellig.length > 0 ? "destructive" : "neutral"}
            />
            <KpiCard label="Bezahlt diesen Monat" value={formatEuro(summe(bezahltMonat))} sub={`${bezahltMonat.length} Rechnungen`} />
            <KpiCard label="Gestellt diesen Monat" value={formatEuro(summe(gestelltMonat))} sub={`${gestelltMonat.length} Rechnungen`} />
          </KpiRow>

          <RechnungenTabelle rechnungen={rechnungen} heute={heute} />
        </div>
      )}
    </div>
  );
}
