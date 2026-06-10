import { Users } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { cn, initialen } from "@/lib/utils";
import type { Fahrschueler } from "@/lib/types";
import { SchuelerListe } from "./schueler-liste";
import { SchuelerAkte } from "./schueler-akte";

export const metadata = { title: "Schüler · FahrschulApp" };

export default async function SchuelerPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const supabase = createClient();

  const [schuelerRes, rechnungRes, lessonsRes] = await Promise.all([
    supabase
      .from("fahrschueler")
      .select("*")
      .order("nachname", { ascending: true })
      .order("vorname", { ascending: true }),
    supabase.from("rechnung").select("schueler_id, betrag_brutto, status"),
    supabase
      .from("fahrstunde")
      .select("schueler_id, fahrlehrer(vorname, nachname)")
      .returns<{ schueler_id: string | null; fahrlehrer: { vorname: string; nachname: string } | null }[]>(),
  ]);

  const schueler = (schuelerRes.data ?? []) as Fahrschueler[];

  // Saldo je Schüler = bezahlt − gesamt (negativ = offen).
  const saldoMap: Record<string, number> = {};
  for (const r of (rechnungRes.data ?? []) as {
    schueler_id: string | null;
    betrag_brutto: number | null;
    status: string;
  }[]) {
    if (!r.schueler_id) continue;
    const brutto = Number(r.betrag_brutto ?? 0);
    saldoMap[r.schueler_id] = (saldoMap[r.schueler_id] ?? 0) + (r.status === "bezahlt" ? 0 : -brutto);
  }

  // Fahrlehrer-Kürzel je Schüler (aus den Fahrstunden).
  const lehrerSets: Record<string, Set<string>> = {};
  for (const row of lessonsRes.data ?? []) {
    if (!row.schueler_id || !row.fahrlehrer) continue;
    (lehrerSets[row.schueler_id] ??= new Set()).add(
      initialen(row.fahrlehrer.vorname, row.fahrlehrer.nachname),
    );
  }
  const lehrerMap: Record<string, string[]> = {};
  for (const [id, set] of Object.entries(lehrerSets)) lehrerMap[id] = Array.from(set);

  const selectedId = searchParams.id;
  const selected = selectedId ? schueler.find((s) => s.id === selectedId) : undefined;

  return (
    <div className="space-y-6">
      <PageHeader title="Schüler" description={`${schueler.length} Schüler insgesamt`} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* Liste (links) */}
        <div className={cn(selected && "hidden lg:block")}>
          <SchuelerListe
            schueler={schueler}
            selectedId={selectedId}
            saldoMap={saldoMap}
            lehrerMap={lehrerMap}
          />
        </div>

        {/* Akte (rechts) */}
        <div className={cn(!selected && "hidden lg:block")}>
          {selected ? (
            <SchuelerAkte schuelerId={selected.id} />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-2 py-24 text-center text-muted-foreground">
                <Users className="h-8 w-8" />
                <p className="text-sm">Wähle links einen Schüler, um die Akte zu sehen.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
