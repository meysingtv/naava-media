import { Receipt } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RECHNUNG_STATUS } from "@/lib/constants";
import { formatDatum, formatEuro } from "@/lib/utils";
import type { Rechnung } from "@/lib/types";
import { getSchuelerKontext } from "../kontext";
import { PortalShell } from "../portal-shell";

export const metadata = { title: "Meine Rechnungen" };

export default async function PortalRechnungenPage() {
  const { schule } = await getSchuelerKontext();
  const supabase = createClient();

  const { data } = await supabase
    .from("rechnung")
    .select("*")
    .order("rechnungsdatum", { ascending: false })
    .returns<Rechnung[]>();

  const rechnungen = data ?? [];
  const offen = rechnungen.filter((r) => r.status !== "bezahlt");
  const offenerBetrag = offen.reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0);

  return (
    <PortalShell schuleName={schule?.name ?? "Fahrschule"}>
      <h1 className="mb-4 text-xl font-semibold tracking-tight">Meine Rechnungen</h1>

      {offenerBetrag > 0 && (
        <Card className="mb-4 border-warning/30 bg-warning-soft">
          <CardContent className="flex items-center justify-between p-4">
            <span className="text-sm font-medium text-warning">Offener Betrag</span>
            <span className="text-lg font-semibold text-warning tabular-nums">{formatEuro(offenerBetrag)}</span>
          </CardContent>
        </Card>
      )}

      {rechnungen.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-strong py-14 text-center text-muted-foreground">
          <Receipt className="h-7 w-7" strokeWidth={1.5} />
          <p className="text-sm">Noch keine Rechnungen.</p>
        </div>
      ) : (
        <Card className="divide-y overflow-hidden">
          {rechnungen.map((r) => {
            const st = RECHNUNG_STATUS[r.status];
            return (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                  <Receipt className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{r.nummer}</p>
                  <p className="text-xs text-muted-foreground">{formatDatum(r.rechnungsdatum)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">{formatEuro(Number(r.betrag_brutto))}</p>
                  <Badge variant="outline" className={st.badge}>
                    {st.label}
                  </Badge>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Fragen zu einer Rechnung? Melde dich einfach in deiner Fahrschule.
      </p>
    </PortalShell>
  );
}
