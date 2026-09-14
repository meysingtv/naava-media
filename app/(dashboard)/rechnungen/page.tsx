import Link from "next/link";
import { FileText, Plus, Receipt } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { RECHNUNG_STATUS } from "@/lib/constants";
import { formatDatum, formatEuro } from "@/lib/utils";
import type { RechnungMitSchueler } from "@/lib/types";

export const metadata = { title: "Rechnungen · FahrschulApp" };

export default async function RechnungenPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("rechnung")
    .select("*, fahrschueler(id, vorname, nachname)")
    .order("rechnungsdatum", { ascending: false })
    .returns<RechnungMitSchueler[]>();

  const rechnungen = data ?? [];
  const offen = rechnungen.filter((r) => r.status === "offen" || r.status === "ueberfaellig");
  const offenerBetrag = offen.reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Rechnungen" description="Erstelle und verwalte Rechnungen.">
        <Button asChild>
          <Link href="/rechnungen/neu">
            <Plus /> Neue Rechnung
          </Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Offener Betrag"
          value={formatEuro(offenerBetrag)}
          icon={Receipt}
          iconClassName={offenerBetrag > 0 ? "bg-warning-soft text-warning" : undefined}
        />
        <StatCard label="Offene Rechnungen" value={offen.length} icon={FileText} />
        <StatCard
          label="Rechnungen gesamt"
          value={rechnungen.length}
          icon={FileText}
          iconClassName="bg-success-soft text-success"
        />
      </div>

      {rechnungen.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Noch keine Rechnungen"
          description="Erstelle deine erste Rechnung mit Positionen und Mehrwertsteuer."
        >
          <Button asChild>
            <Link href="/rechnungen/neu">
              <Plus /> Neue Rechnung
            </Link>
          </Button>
        </EmptyState>
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <ul className="divide-y">
              {rechnungen.map((r) => {
                const status = RECHNUNG_STATUS[r.status];
                return (
                  <li key={r.id}>
                    <Link
                      href={`/rechnungen/${r.id}`}
                      className="flex items-center gap-4 px-5 py-3 transition-colors duration-fast hover:bg-surface focus-visible:bg-surface focus-visible:outline-none"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                        <FileText className="h-4 w-4" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{r.nummer}</p>
                        <p className="truncate text-[13px] text-muted-foreground">
                          {r.fahrschueler
                            ? `${r.fahrschueler.vorname} ${r.fahrschueler.nachname}`
                            : "Ohne Schüler"}{" "}
                          · {formatDatum(r.rechnungsdatum)}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-foreground tabular-nums">
                        {formatEuro(Number(r.betrag_brutto))}
                      </span>
                      <Badge variant="outline" className={status.badge}>
                        {status.label}
                      </Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
