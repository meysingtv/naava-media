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
          iconClassName="bg-amber-100 text-amber-600"
        />
        <StatCard label="Offene Rechnungen" value={offen.length} icon={FileText} />
        <StatCard
          label="Rechnungen gesamt"
          value={rechnungen.length}
          icon={FileText}
          iconClassName="bg-emerald-100 text-emerald-600"
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
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {rechnungen.map((r) => {
                const status = RECHNUNG_STATUS[r.status];
                return (
                  <li key={r.id}>
                    <Link
                      href={`/rechnungen/${r.id}`}
                      className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-accent"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{r.nummer}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {r.fahrschueler
                            ? `${r.fahrschueler.vorname} ${r.fahrschueler.nachname}`
                            : "Ohne Schüler"}{" "}
                          · {formatDatum(r.rechnungsdatum)}
                        </p>
                      </div>
                      <span className="shrink-0 font-semibold">
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
