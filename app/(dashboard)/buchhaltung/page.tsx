import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Download, Euro, Trash2, Wallet } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { cn, formatDatum, formatEuro } from "@/lib/utils";
import type { KassenbuchEintrag, Rechnung } from "@/lib/types";
import { KassenbuchNeu } from "./kassenbuch-neu";
import { kassenEintragLoeschen } from "./actions";

export const metadata = { title: "Buchhaltung · FahrschulApp" };

const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

export default async function BuchhaltungPage() {
  const supabase = createClient();
  const jahr = new Date().getFullYear();

  const [rechnungRes, kassenRes] = await Promise.all([
    supabase
      .from("rechnung")
      .select("rechnungsdatum, betrag_netto, betrag_brutto, status")
      .gte("rechnungsdatum", `${jahr}-01-01`)
      .lte("rechnungsdatum", `${jahr}-12-31`)
      .returns<Pick<Rechnung, "rechnungsdatum" | "betrag_netto" | "betrag_brutto" | "status">[]>(),
    supabase
      .from("kassenbuch_eintrag")
      .select("*")
      .order("datum", { ascending: false })
      .order("created_at", { ascending: false })
      .returns<KassenbuchEintrag[]>(),
  ]);

  const rechnungen = rechnungRes.data ?? [];
  const netto = rechnungen.reduce((s, r) => s + Number(r.betrag_netto ?? 0), 0);
  const brutto = rechnungen.reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0);
  const ust = brutto - netto;
  const offen = rechnungen
    .filter((r) => r.status !== "bezahlt")
    .reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0);

  // Umsatz je Monat
  const monatsUmsatz: number[] = Array.from({ length: 12 }, () => 0);
  for (const r of rechnungen) {
    if (!r.rechnungsdatum) continue;
    const m = Number(r.rechnungsdatum.slice(5, 7)) - 1;
    if (m >= 0 && m < 12) monatsUmsatz[m] += Number(r.betrag_brutto ?? 0);
  }

  // Kassenbuch
  const kasse = kassenRes.data ?? [];
  const einnahmen = kasse.filter((k) => k.typ === "einnahme").reduce((s, k) => s + Number(k.betrag), 0);
  const ausgaben = kasse.filter((k) => k.typ === "ausgabe").reduce((s, k) => s + Number(k.betrag), 0);
  const saldo = einnahmen - ausgaben;

  return (
    <div className="space-y-6">
      <PageHeader title="Buchhaltung" description={`Umsatz, Umsatzsteuer & Kassenbuch für ${jahr}.`}>
        <Button asChild variant="outline">
          <Link href={`/buchhaltung/datev?jahr=${jahr}`}>
            <Download /> DATEV-Export
          </Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={`Umsatz ${jahr} (brutto)`} value={formatEuro(brutto)} icon={Euro} />
        <StatCard label="Umsatz netto" value={formatEuro(netto)} icon={Euro} />
        <StatCard label="Umsatzsteuer" value={formatEuro(ust)} icon={Euro} />
        <StatCard
          label="Offene Forderungen"
          value={formatEuro(offen)}
          icon={ArrowDownRight}
          iconClassName={offen > 0 ? "bg-warning-soft text-warning" : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Umsatz je Monat */}
        <Card className="overflow-hidden">
          <CardHeader className="p-5 pb-3">
            <CardTitle>Umsatz je Monat</CardTitle>
          </CardHeader>
          <div className="border-t">
            <table className="w-full text-sm tabular-nums">
              <tbody className="divide-y">
                {monatsUmsatz.map((wert, i) => (
                  <tr key={i} className="transition-colors hover:bg-surface">
                    <td className="px-5 py-2 text-foreground-secondary">{MONATE[i]}</td>
                    <td className="px-5 py-2 text-right font-medium text-foreground">{formatEuro(wert)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-surface font-semibold">
                  <td className="px-5 py-2.5">Gesamt</td>
                  <td className="px-5 py-2.5 text-right">{formatEuro(brutto)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        {/* Kassenbuch */}
        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-center justify-between space-y-0 p-5 pb-3">
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} /> Kassenbuch
            </CardTitle>
            <KassenbuchNeu />
          </CardHeader>

          <div className="grid grid-cols-3 gap-px border-y bg-border text-center">
            <div className="bg-card px-3 py-2.5">
              <p className="text-2xs uppercase tracking-wide text-muted-foreground">Einnahmen</p>
              <p className="text-sm font-semibold text-success tabular-nums">{formatEuro(einnahmen)}</p>
            </div>
            <div className="bg-card px-3 py-2.5">
              <p className="text-2xs uppercase tracking-wide text-muted-foreground">Ausgaben</p>
              <p className="text-sm font-semibold text-destructive tabular-nums">{formatEuro(ausgaben)}</p>
            </div>
            <div className="bg-card px-3 py-2.5">
              <p className="text-2xs uppercase tracking-wide text-muted-foreground">Saldo</p>
              <p className={cn("text-sm font-semibold tabular-nums", saldo < 0 ? "text-destructive" : "text-foreground")}>
                {formatEuro(saldo)}
              </p>
            </div>
          </div>

          {kasse.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              Noch keine Kassenbuch-Einträge.
            </p>
          ) : (
            <div className="max-h-[360px] divide-y overflow-y-auto scrollbar-thin">
              {kasse.map((k) => {
                const einnahme = k.typ === "einnahme";
                return (
                  <div key={k.id} className="flex items-center gap-3 px-5 py-2.5">
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                        einnahme ? "bg-success-soft text-success" : "bg-destructive-soft text-destructive",
                      )}
                    >
                      {einnahme ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {k.kategorie || (einnahme ? "Einnahme" : "Ausgabe")}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDatum(k.datum)}
                        {k.beschreibung ? ` · ${k.beschreibung}` : ""}
                        {k.beleg ? ` · ${k.beleg}` : ""}
                      </p>
                    </div>
                    <span className={cn("shrink-0 text-sm font-semibold tabular-nums", einnahme ? "text-success" : "text-destructive")}>
                      {einnahme ? "+" : "−"}
                      {formatEuro(Number(k.betrag))}
                    </span>
                    <form action={kassenEintragLoeschen}>
                      <input type="hidden" name="id" value={k.id} />
                      <button
                        type="submit"
                        aria-label="Löschen"
                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive-soft hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Hinweis: Der DATEV-Export ist ein Buchungsstapel-CSV als Startpunkt für deinen Steuerberater –
        Konten (SKR03) ggf. anpassen.
      </p>
    </div>
  );
}
