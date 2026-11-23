import Link from "next/link";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { KpiCard, KpiRow } from "@/components/ui/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { lohnVon } from "@/lib/lohn";
import { formatEuro } from "@/lib/utils";
import { heuteBerlin, stunden } from "@/lib/zeit";
import type { Fahrlehrer, Fahrstunde } from "@/lib/types";
import { LohnTabelle, type LohnZeile } from "./lohn-tabelle";

export const metadata = { title: "Lohn · FahrschulApp" };

/** Monat verschieben: „2026-09" + 1 → „2026-10". */
function verschiebe(monat: string, n: number): string {
  const [y, m] = monat.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
}

function monatsName(monat: string): string {
  const [y, m] = monat.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("de-DE", { month: "long", year: "numeric", timeZone: "UTC" });
}

export default async function LohnPage({ searchParams }: { searchParams: { monat?: string } }) {
  const aktuell = heuteBerlin().slice(0, 7);
  const monat = /^\d{4}-\d{2}$/.test(searchParams.monat ?? "") ? (searchParams.monat as string) : aktuell;
  const [y, m] = monat.split("-").map(Number);
  const start = `${monat}-01`;
  const ende = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);

  const supabase = createClient();
  const [lehrerRes, stundenRes] = await Promise.all([
    supabase.from("fahrlehrer").select("*").order("nachname").returns<Fahrlehrer[]>(),
    supabase
      .from("fahrstunde")
      .select("fahrlehrer_id, dauer_minuten, status")
      .gte("datum", start)
      .lte("datum", ende)
      .eq("status", "abgeschlossen")
      .returns<Pick<Fahrstunde, "fahrlehrer_id" | "dauer_minuten" | "status">[]>(),
  ]);

  const anzahl: Record<string, number> = {};
  const minuten: Record<string, number> = {};
  for (const f of stundenRes.data ?? []) {
    if (!f.fahrlehrer_id) continue;
    anzahl[f.fahrlehrer_id] = (anzahl[f.fahrlehrer_id] ?? 0) + 1;
    minuten[f.fahrlehrer_id] = (minuten[f.fahrlehrer_id] ?? 0) + (f.dauer_minuten ?? 45);
  }

  // Archivierte Mitarbeiter nur, wenn sie im Monat noch gefahren sind
  const zeilen: LohnZeile[] = (lehrerRes.data ?? [])
    .filter((f) => f.aktiv || (anzahl[f.id] ?? 0) > 0)
    .map((f) => ({
      id: f.id,
      name: `${f.vorname} ${f.nachname}`,
      anzahl: anzahl[f.id] ?? 0,
      minuten: minuten[f.id] ?? 0,
      proFahrstunde: f.lohn_pro_fahrstunde != null ? Number(f.lohn_pro_fahrstunde) : null,
      stundenlohn: f.stundenlohn != null ? Number(f.stundenlohn) : null,
    }));

  const gesamt = zeilen.reduce((s, z) => s + lohnVon(z), 0);
  const fahrstunden = zeilen.reduce((s, z) => s + z.anzahl, 0);
  const minutenGesamt = zeilen.reduce((s, z) => s + z.minuten, 0);
  const mitStunden = zeilen.filter((z) => z.anzahl > 0);
  const ohneSatz = mitStunden.filter((z) => z.proFahrstunde == null && z.stundenlohn == null);

  return (
    <div>
      <PageHeader title="Lohn">
        <div className="inline-flex h-8 items-center rounded-lg bg-card p-0.5 shadow-panel">
          <Button asChild variant="ghost" size="icon-xs" aria-label="Vorheriger Monat">
            <Link href={`/lohn?monat=${verschiebe(monat, -1)}`} scroll={false}>
              <ChevronLeft />
            </Link>
          </Button>
          <span className="min-w-[132px] px-2 text-center text-13 font-medium tabular-nums text-foreground">{monatsName(monat)}</span>
          <Button asChild variant="ghost" size="icon-xs" aria-label="Nächster Monat" className={monat >= aktuell ? "pointer-events-none opacity-40" : undefined}>
            <Link href={`/lohn?monat=${verschiebe(monat, 1)}`} scroll={false} aria-disabled={monat >= aktuell}>
              <ChevronRight />
            </Link>
          </Button>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/lohn/export?monat=${monat}`}>
            <Download /> CSV
          </Link>
        </Button>
      </PageHeader>

      <div className="space-y-6">
        <KpiRow>
          <KpiCard label="Lohnsumme" value={formatEuro(gesamt)} sub={monatsName(monat)} />
          <KpiCard label="Abgeschlossene Fahrstunden" value={fahrstunden} sub={stunden(minutenGesamt)} />
          <KpiCard
            label="Ø je Fahrlehrer"
            value={mitStunden.length ? formatEuro(gesamt / mitStunden.length) : "—"}
            sub={`${mitStunden.length} Fahrlehrer mit Stunden`}
          />
          <KpiCard
            label="Ohne Lohnsatz"
            value={ohneSatz.length}
            sub={ohneSatz.length ? ohneSatz.map((z) => z.name.split(" ")[0]).join(", ") : "Alle Sätze hinterlegt"}
            tone={ohneSatz.length ? "warning" : "neutral"}
          />
        </KpiRow>

        <LohnTabelle zeilen={zeilen} />

        <p className="text-xs text-foreground-tertiary">
          Gezählt werden abgeschlossene Fahrstunden. Ist ein Satz je Fahrstunde hinterlegt, gilt er; sonst Stundenlohn × gefahrene Stunden.
        </p>
      </div>
    </div>
  );
}
