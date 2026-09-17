import { Suspense } from "react";
import { Users } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { pflichtFahrtenFuer } from "@/lib/constants";
import { cn, initialen } from "@/lib/utils";
import { DEMO, demoSchuelerFull, demoSchuelerLessonRows, demoSchuelerRechnungRows } from "@/lib/demo";
import type { Fahrschueler } from "@/lib/types";
import { SchuelerListe, type Fortschritt } from "./schueler-liste";
import { SchuelerAkte } from "./schueler-akte";
import { KiLernstatusDialog } from "./ki-lernstatus-dialog";

export const metadata = { title: "Schüler · FahrschulApp" };

function AkteSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true">
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-10 rounded-xl" />
      <div className="grid gap-3 xl:grid-cols-2">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  );
}

export default async function SchuelerPage({ searchParams }: { searchParams: { id?: string } }) {
  const supabase = createClient();

  const [schuelerRes, rechnungRes, lessonsRes] = await Promise.all([
    supabase.from("fahrschueler").select("*").order("nachname", { ascending: true }).order("vorname", { ascending: true }),
    supabase.from("rechnung").select("schueler_id, betrag_brutto, status"),
    supabase
      .from("fahrstunde")
      .select("schueler_id, typ, status, fahrlehrer(vorname, nachname)")
      .returns<
        { schueler_id: string | null; typ: string; status: string; fahrlehrer: { vorname: string; nachname: string } | null }[]
      >(),
  ]);

  const schueler = DEMO ? demoSchuelerFull : ((schuelerRes.data ?? []) as Fahrschueler[]);
  const rechnungRows = DEMO ? demoSchuelerRechnungRows : ((rechnungRes.data ?? []) as { schueler_id: string | null; betrag_brutto: number | null; status: string }[]);
  const lessonRows = DEMO ? demoSchuelerLessonRows : (lessonsRes.data ?? []);

  // Saldo je Schüler (offene Rechnungen negativ)
  const saldoMap: Record<string, number> = {};
  for (const r of rechnungRows) {
    if (!r.schueler_id) continue;
    const brutto = Number(r.betrag_brutto ?? 0);
    saldoMap[r.schueler_id] = (saldoMap[r.schueler_id] ?? 0) + (r.status === "bezahlt" ? 0 : -brutto);
  }

  // Fahrlehrer-Kürzel + Ausbildungsfortschritt je Schüler
  const lehrerSets: Record<string, Set<string>> = {};
  const zaehler: Record<string, { ueberland: number; autobahn: number; nacht: number; gesamt: number }> = {};
  for (const row of lessonRows) {
    if (!row.schueler_id) continue;
    if (row.fahrlehrer) (lehrerSets[row.schueler_id] ??= new Set()).add(initialen(row.fahrlehrer.vorname, row.fahrlehrer.nachname));
    if (row.status !== "abgeschlossen") continue;
    const z = (zaehler[row.schueler_id] ??= { ueberland: 0, autobahn: 0, nacht: 0, gesamt: 0 });
    z.gesamt += 1;
    if (row.typ === "ueberland") z.ueberland += 1;
    if (row.typ === "autobahn") z.autobahn += 1;
    if (row.typ === "nacht") z.nacht += 1;
  }
  const lehrerMap: Record<string, string[]> = {};
  for (const [id, set] of Object.entries(lehrerSets)) lehrerMap[id] = Array.from(set);

  const fortschrittMap: Record<string, Fortschritt> = {};
  for (const s of schueler) {
    const pflicht = pflichtFahrtenFuer(s.fuehrerscheinklassen?.[0] ?? "B");
    const z = zaehler[s.id] ?? { ueberland: 0, autobahn: 0, nacht: 0, gesamt: 0 };
    const sonderOk = z.ueberland >= pflicht.ueberland && z.autobahn >= pflicht.autobahn && z.nacht >= pflicht.nacht;
    fortschrittMap[s.id] = {
      theorie: s.theorie_bestanden ? 100 : Math.min(99, s.lernstatus ?? 0),
      ueberland: pflicht.ueberland ? Math.min(100, Math.round((z.ueberland / pflicht.ueberland) * 100)) : 100,
      autobahn: pflicht.autobahn ? Math.min(100, Math.round((z.autobahn / pflicht.autobahn) * 100)) : 100,
      nacht: pflicht.nacht ? Math.min(100, Math.round((z.nacht / pflicht.nacht) * 100)) : 100,
      fahrstunden: z.gesamt,
      pruefungsreif: Boolean(s.theorie_bestanden && sonderOk),
      unterlagenFehlen: [!s.sehtest_am, !s.erste_hilfe_am, !s.passbild_ok].filter(Boolean).length,
    };
  }

  const selectedId = searchParams.id;
  const selected = selectedId ? schueler.find((s) => s.id === selectedId) : undefined;

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Ausbildung" title="Schüler" description={`${schueler.length} in Ausbildung`}>
        <KiLernstatusDialog />
      </PageHeader>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className={cn(selected && "hidden xl:block")}>
          <SchuelerListe
            schueler={schueler}
            selectedId={selectedId}
            saldoMap={saldoMap}
            lehrerMap={lehrerMap}
            fortschrittMap={fortschrittMap}
          />
        </div>

        <div className={cn(!selected && "hidden xl:block")}>
          {selected ? (
            <Suspense key={selected.id} fallback={<AkteSkeleton />}>
              <SchuelerAkte schuelerId={selected.id} />
            </Suspense>
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-border-strong text-center">
              <Users className="mb-2 h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
              <p className="text-[13px] text-muted-foreground">Schüler auswählen, um den Ausbildungsprozess zu sehen.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
