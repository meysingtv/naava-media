import Link from "next/link";
import { Download, Landmark, Mail } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatEuro } from "@/lib/utils";
import type { Fahrschueler, Rechnung } from "@/lib/types";

export const metadata = { title: "Kostenträger · FahrschulApp" };

type Zeile = {
  name: string;
  email: string | null;
  anzahl: number;
  gesamt: number;
  offen: number;
};

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
  const map = new Map<string, Zeile>();
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
  const anzahlSchueler = zeilen.reduce((s, z) => s + z.anzahl, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kostenträger"
        description="Sammelabrechnung für Jobcenter, Agentur für Arbeit, Reha-Träger &amp; Co."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Kostenträger" value={zeilen.length} icon={Landmark} />
        <StatCard label="Geförderte Schüler" value={anzahlSchueler} icon={Landmark} />
        <StatCard
          label="Offen bei Kostenträgern"
          value={formatEuro(summeOffen)}
          icon={Landmark}
          iconClassName={summeOffen > 0 ? "bg-warning-soft text-warning" : undefined}
        />
      </div>

      {zeilen.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="Noch keine Kostenträger"
          description="Trage bei Schülern im Feld „Kostenträger“ z. B. Jobcenter oder Agentur für Arbeit ein – dann erscheinen sie hier zur Sammelabrechnung."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <thead className="border-b bg-surface text-left text-[13px] text-muted-foreground">
                <tr>
                  <th className="h-10 px-4 font-medium">Kostenträger</th>
                  <th className="h-10 px-4 font-medium">Schüler</th>
                  <th className="h-10 px-4 text-right font-medium">Gesamt</th>
                  <th className="h-10 px-4 text-right font-medium">Offen</th>
                  <th className="h-10 px-4 text-right font-medium">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {zeilen.map((z) => (
                  <tr key={z.name} className="transition-colors hover:bg-surface">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{z.name}</p>
                      {z.email && (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" /> {z.email}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{z.anzahl}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-foreground">{formatEuro(z.gesamt)}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      <span className={z.offen > 0 ? "text-warning" : "text-muted-foreground"}>
                        {formatEuro(z.offen)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {z.email && (
                          <Button asChild variant="ghost" size="icon-sm" aria-label="E-Mail an Kostenträger">
                            <a href={`mailto:${z.email}?subject=${encodeURIComponent(`Sammelabrechnung – ${z.name}`)}`}>
                              <Mail />
                            </a>
                          </Button>
                        )}
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/kostentraeger/export?traeger=${encodeURIComponent(z.name)}`}>
                            <Download /> CSV
                          </Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
