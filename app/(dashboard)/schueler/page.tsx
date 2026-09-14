import { Suspense } from "react";
import { Users } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, initialen } from "@/lib/utils";
import type { Fahrschueler } from "@/lib/types";
import { SchuelerListe } from "./schueler-liste";
import { SchuelerAkte } from "./schueler-akte";
import { KiLernstatusDialog } from "./ki-lernstatus-dialog";

export const metadata = { title: "Schüler · FahrschulApp" };

function AkteSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true">
      <div className="rounded-lg border bg-card p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        <div className="space-y-3">
          <Skeleton className="h-36 rounded-lg" />
          <Skeleton className="h-52 rounded-lg" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-44 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

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
      <PageHeader title="Schüler" description={`${schueler.length} Schüler insgesamt`}>
        <KiLernstatusDialog />
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className={cn(selected && "hidden lg:block")}>
          <SchuelerListe
            schueler={schueler}
            selectedId={selectedId}
            saldoMap={saldoMap}
            lehrerMap={lehrerMap}
          />
        </div>

        <div className={cn(!selected && "hidden lg:block")}>
          {selected ? (
            <Suspense key={selected.id} fallback={<AkteSkeleton />}>
              <SchuelerAkte schuelerId={selected.id} />
            </Suspense>
          ) : (
            <Card className="border-dashed border-border-strong shadow-none">
              <CardContent className="flex flex-col items-center justify-center gap-3 py-24 text-center">
                <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-primary-soft text-primary">
                  <Users className="h-8 w-8" strokeWidth={1.5} />
                </span>
                <p className="text-sm text-muted-foreground">Wähle links einen Schüler, um die Akte zu sehen.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
