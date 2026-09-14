import { ArrowUpRight, Trash2, Wallet } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDatum, formatEuro } from "@/lib/utils";
import type { Fahrschueler, Rechnung, Zahlung } from "@/lib/types";
import { ZahlungNeu, type OffeneRechnung } from "./zahlung-neu";
import { zahlungLoeschen } from "./actions";

export const metadata = { title: "Zahlungen · FahrschulApp" };

const ART: Record<string, string> = {
  bar: "Bar",
  ueberweisung: "Überweisung",
  lastschrift: "Lastschrift",
  karte: "Karte",
};

type ZahlungRow = Zahlung & {
  fahrschueler: Pick<Fahrschueler, "vorname" | "nachname"> | null;
  rechnung: Pick<Rechnung, "nummer"> | null;
};
type OffeneRow = Pick<Rechnung, "id" | "nummer" | "betrag_brutto" | "schueler_id"> & {
  fahrschueler: Pick<Fahrschueler, "vorname" | "nachname"> | null;
};

export default async function ZahlungenPage() {
  const supabase = createClient();
  const jahr = new Date().getFullYear();

  const [zahlungRes, schuelerRes, offeneRes] = await Promise.all([
    supabase
      .from("zahlung")
      .select("*, fahrschueler(vorname, nachname), rechnung(nummer)")
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
  const dieseJahr = zahlungen.filter((z) => (z.datum ?? "").slice(0, 4) === String(jahr));
  const summeJahr = dieseJahr.reduce((s, z) => s + Number(z.betrag ?? 0), 0);

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
    <div className="space-y-6">
      <PageHeader title="Zahlungen" description="Zahlungseingänge erfassen und Rechnungen abgleichen.">
        <ZahlungNeu schueler={schueler} offene={offeneOpts} />
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={`Eingänge ${jahr}`} value={formatEuro(summeJahr)} icon={Wallet} iconClassName="bg-success-soft text-success" />
        <StatCard label="Buchungen" value={dieseJahr.length} icon={Wallet} />
        <StatCard
          label="Noch offen"
          value={formatEuro(offenerBetrag)}
          icon={Wallet}
          iconClassName={offenerBetrag > 0 ? "bg-warning-soft text-warning" : undefined}
          hint={`${offene.length} Rechnungen`}
        />
      </div>

      {zahlungen.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Noch keine Zahlungen erfasst"
          description="Buche deinen ersten Zahlungseingang – ordne ihn optional direkt einer offenen Rechnung zu."
        >
          <ZahlungNeu schueler={schueler} offene={offeneOpts} />
        </EmptyState>
      ) : (
        <Card className="divide-y overflow-hidden">
          {zahlungen.map((z) => (
            <div key={z.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
                <ArrowUpRight className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {z.fahrschueler ? `${z.fahrschueler.vorname} ${z.fahrschueler.nachname}` : "Ohne Schüler"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatDatum(z.datum)} · {ART[z.art] ?? z.art}
                  {z.rechnung ? ` · ${z.rechnung.nummer}` : ""}
                  {z.notiz ? ` · ${z.notiz}` : ""}
                </p>
              </div>
              {z.rechnung && <Badge variant="success">abgeglichen</Badge>}
              <span className="shrink-0 text-sm font-semibold text-success tabular-nums">
                +{formatEuro(Number(z.betrag))}
              </span>
              <form action={zahlungLoeschen}>
                <input type="hidden" name="id" value={z.id} />
                <button
                  type="submit"
                  aria-label="Löschen"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive-soft hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </form>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
