import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { pflichtFahrtenFuer } from "@/lib/constants";
import { initialen } from "@/lib/utils";
import type { Fahrschueler } from "@/lib/types";
import { darf } from "@/lib/zugriff";
import { SchuelerListe, type Fortschritt } from "./schueler-liste";
import { KiLernstatusDialog } from "./ki-lernstatus-dialog";

export const metadata = { title: "Schüler · FahrschulApp" };

export default async function SchuelerPage({ searchParams }: { searchParams: { id?: string } }) {
  // Alte Links (/schueler?id=…) führen auf die eigene Akte-Seite.
  if (searchParams.id) redirect(`/schueler/${searchParams.id}`);

  const supabase = createClient();
  // Beträge sieht nur, wer auch die Rechnungen sehen darf (nicht Fahrlehrer).
  const zeigeFinanzen = await darf("/rechnungen");

  const [schuelerRes, rechnungRes, lessonsRes] = await Promise.all([
    supabase.from("fahrschueler").select("*").order("nachname", { ascending: true }).order("vorname", { ascending: true }),
    zeigeFinanzen
      ? supabase.from("rechnung").select("schueler_id, betrag_brutto, status")
      : Promise.resolve({ data: [] as { schueler_id: string | null; betrag_brutto: number | null; status: string }[] }),
    supabase
      .from("fahrstunde")
      .select("schueler_id, typ, status, fahrlehrer(vorname, nachname)")
      .returns<
        { schueler_id: string | null; typ: string; status: string; fahrlehrer: { vorname: string; nachname: string } | null }[]
      >(),
  ]);

  const schueler = (schuelerRes.data ?? []) as Fahrschueler[];

  // Offener Rechnungsbetrag je Schüler
  const offenMap: Record<string, number> = {};
  for (const r of (rechnungRes.data ?? []) as { schueler_id: string | null; betrag_brutto: number | null; status: string }[]) {
    if (!r.schueler_id || r.status === "bezahlt") continue;
    offenMap[r.schueler_id] = (offenMap[r.schueler_id] ?? 0) + Number(r.betrag_brutto ?? 0);
  }

  // Fahrlehrer-Kürzel + Ausbildungsfortschritt je Schüler
  const lehrerSets: Record<string, Set<string>> = {};
  const zaehler: Record<string, { ueberland: number; autobahn: number; nacht: number; gesamt: number }> = {};
  for (const row of lessonsRes.data ?? []) {
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
      sonderIst:
        Math.min(z.ueberland, pflicht.ueberland) + Math.min(z.autobahn, pflicht.autobahn) + Math.min(z.nacht, pflicht.nacht),
      sonderSoll: pflicht.ueberland + pflicht.autobahn + pflicht.nacht,
    };
  }

  return (
    <div>
      <PageHeader title="Schüler">
        <KiLernstatusDialog />
        <Button asChild size="sm">
          <Link href="/schueler/neu">
            <Plus /> Schüler anlegen
          </Link>
        </Button>
      </PageHeader>

      <SchuelerListe
        schueler={schueler}
        offenMap={offenMap}
        lehrerMap={lehrerMap}
        fortschrittMap={fortschrittMap}
        zeigeFinanzen={zeigeFinanzen}
      />
    </div>
  );
}
