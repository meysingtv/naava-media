import Link from "next/link";
import { Coins, Download } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { formatEuro } from "@/lib/utils";
import type { Fahrlehrer, Fahrstunde } from "@/lib/types";
import { lohnSatzSetzen } from "./actions";

export const metadata = { title: "Lohn · FahrschulApp" };

const feld =
  "h-9 w-24 rounded-md border border-border-strong bg-background px-2 text-sm shadow-xs focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20";

function monatsGrenzen(monat: string): { start: string; ende: string; label: string } {
  const [y, m] = monat.split("-").map(Number);
  const start = `${monat}-01`;
  const ende = new Date(y, m, 0).toISOString().slice(0, 10);
  const label = new Date(y, m - 1, 1).toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  return { start, ende, label };
}

export default async function LohnPage({ searchParams }: { searchParams: { monat?: string } }) {
  const heute = new Date();
  const monat = searchParams.monat ?? `${heute.getFullYear()}-${String(heute.getMonth() + 1).padStart(2, "0")}`;
  const { start, ende, label } = monatsGrenzen(monat);

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

  const lehrer = lehrerRes.data ?? [];
  const stunden = stundenRes.data ?? [];

  const anzahl: Record<string, number> = {};
  const minuten: Record<string, number> = {};
  for (const f of stunden) {
    if (!f.fahrlehrer_id) continue;
    anzahl[f.fahrlehrer_id] = (anzahl[f.fahrlehrer_id] ?? 0) + 1;
    minuten[f.fahrlehrer_id] = (minuten[f.fahrlehrer_id] ?? 0) + (f.dauer_minuten ?? 45);
  }

  function lohnVon(f: Fahrlehrer): number {
    const n = anzahl[f.id] ?? 0;
    const std = (minuten[f.id] ?? 0) / 60;
    if (f.lohn_pro_fahrstunde != null) return n * Number(f.lohn_pro_fahrstunde);
    if (f.stundenlohn != null) return std * Number(f.stundenlohn);
    return 0;
  }

  const gesamt = lehrer.reduce((s, f) => s + lohnVon(f), 0);
  const fahrstundenGesamt = stunden.length;

  return (
    <div className="space-y-6">
      <PageHeader title="Lohn" description="Fahrlehrer-Vergütung je Monat auf Basis geleisteter Fahrstunden.">
        <form method="GET" className="flex items-center gap-2">
          <input type="month" name="monat" defaultValue={monat} className={`${feld} w-40`} />
          <Button type="submit" variant="outline" size="sm">
            Anzeigen
          </Button>
        </form>
        <Button asChild variant="outline">
          <Link href={`/lohn/export?monat=${monat}`}>
            <Download /> CSV
          </Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Abrechnungsmonat" value={label} icon={Coins} />
        <StatCard label="Fahrstunden (abgeschl.)" value={fahrstundenGesamt} icon={Coins} />
        <StatCard label="Lohnsumme" value={formatEuro(gesamt)} icon={Coins} iconClassName="bg-success-soft text-success" />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead className="border-b bg-surface text-left text-[13px] text-muted-foreground">
              <tr>
                <th className="h-10 px-4 font-medium">Fahrlehrer</th>
                <th className="h-10 px-4 text-right font-medium">Fahrstd.</th>
                <th className="h-10 px-4 text-right font-medium">Stunden</th>
                <th className="h-10 px-4 font-medium">€/Fahrstunde</th>
                <th className="h-10 px-4 font-medium">€/Stunde</th>
                <th className="h-10 px-4 text-right font-medium">Lohn</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {lehrer.map((f) => (
                <tr key={f.id} className="hover:bg-surface">
                  <td className="px-4 py-2.5 font-medium text-foreground">
                    {f.vorname} {f.nachname}
                  </td>
                  <td className="px-4 py-2.5 text-right">{anzahl[f.id] ?? 0}</td>
                  <td className="px-4 py-2.5 text-right">{((minuten[f.id] ?? 0) / 60).toFixed(1)}</td>
                  <td className="px-4 py-2.5" colSpan={2}>
                    <form action={lohnSatzSetzen} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={f.id} />
                      <input
                        type="number"
                        step="0.01"
                        name="lohn_pro_fahrstunde"
                        defaultValue={f.lohn_pro_fahrstunde ?? undefined}
                        placeholder="€/Fahrstd."
                        className={feld}
                      />
                      <input
                        type="number"
                        step="0.01"
                        name="stundenlohn"
                        defaultValue={f.stundenlohn ?? undefined}
                        placeholder="€/Std."
                        className={feld}
                      />
                      <button
                        type="submit"
                        className="rounded-md border border-border-strong px-2 py-1.5 text-xs font-medium transition-colors hover:bg-surface"
                      >
                        Speichern
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold">{formatEuro(lohnVon(f))}</td>
                </tr>
              ))}
              {lehrer.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Keine Fahrlehrer vorhanden.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t bg-surface font-semibold">
                <td className="px-4 py-2.5" colSpan={5}>
                  Gesamt
                </td>
                <td className="px-4 py-2.5 text-right">{formatEuro(gesamt)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <p className="text-xs text-muted-foreground">
        Lohn = Fahrstunden × €/Fahrstunde. Ist kein Fahrstunden-Satz gesetzt, wird €/Stunde × geleistete
        Stunden verwendet. Sätze pro Fahrlehrer oben direkt speicherbar.
      </p>
    </div>
  );
}
