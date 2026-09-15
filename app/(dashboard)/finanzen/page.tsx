import Link from "next/link";
import { ArrowRight, Bell } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { cn, formatDatum, formatEuro } from "@/lib/utils";
import type { Fahrschueler, Rechnung, Zahlung } from "@/lib/types";

export const metadata = { title: "Finanzen · FahrschulApp" };

const MONATE_KURZ = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

function monatsKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type RechnungRow = Pick<Rechnung, "id" | "nummer" | "betrag_brutto" | "status" | "rechnungsdatum" | "faelligkeitsdatum" | "mahnstufe"> & {
  fahrschueler: Pick<Fahrschueler, "vorname" | "nachname"> | null;
};
type ZahlungRow = Pick<Zahlung, "id" | "betrag" | "datum" | "art"> & { fahrschueler: Pick<Fahrschueler, "vorname" | "nachname"> | null };

export default async function FinanzenPage() {
  const supabase = createClient();
  const jetzt = new Date();
  const heute = jetzt.toISOString().slice(0, 10);
  const jahr = jetzt.getFullYear();
  const monatStart = `${monatsKey(jetzt)}-01`;
  const sechsZurueck = new Date(jetzt.getFullYear(), jetzt.getMonth() - 5, 1);

  const [rechnungRes, zahlungRes] = await Promise.all([
    supabase
      .from("rechnung")
      .select("id, nummer, betrag_brutto, status, rechnungsdatum, faelligkeitsdatum, mahnstufe, fahrschueler(vorname, nachname)")
      .order("rechnungsdatum", { ascending: false })
      .returns<RechnungRow[]>(),
    supabase
      .from("zahlung")
      .select("id, betrag, datum, art, fahrschueler(vorname, nachname)")
      .order("datum", { ascending: false })
      .returns<ZahlungRow[]>(),
  ]);

  const rechnungen = rechnungRes.data ?? [];
  const zahlungen = zahlungRes.data ?? [];

  const offen = rechnungen.filter((r) => r.status !== "bezahlt");
  const offenSumme = offen.reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0);
  const ueberfaellig = offen.filter((r) => r.status === "ueberfaellig" || (r.faelligkeitsdatum && r.faelligkeitsdatum < heute));
  const ueberfaelligSumme = ueberfaellig.reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0);
  const eingaengeMonat = zahlungen.filter((z) => z.datum >= monatStart).reduce((s, z) => s + Number(z.betrag ?? 0), 0);
  const umsatzJahr = rechnungen.filter((r) => (r.rechnungsdatum ?? "").startsWith(String(jahr))).reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0);

  // Sechs Monate: Rechnungen vs. Zahlungen
  const monate: { key: string; label: string; rechnungen: number; zahlungen: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(sechsZurueck.getFullYear(), sechsZurueck.getMonth() + i, 1);
    monate.push({ key: monatsKey(d), label: MONATE_KURZ[d.getMonth()], rechnungen: 0, zahlungen: 0 });
  }
  const idx: Record<string, number> = {};
  monate.forEach((m, i) => (idx[m.key] = i));
  for (const r of rechnungen) {
    const k = (r.rechnungsdatum ?? "").slice(0, 7);
    if (k in idx) monate[idx[k]].rechnungen += Number(r.betrag_brutto ?? 0);
  }
  for (const z of zahlungen) {
    const k = (z.datum ?? "").slice(0, 7);
    if (k in idx) monate[idx[k]].zahlungen += Number(z.betrag ?? 0);
  }
  const max = Math.max(1, ...monate.map((m) => Math.max(m.rechnungen, m.zahlungen)));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Finanzen" title="Übersicht" description="Liquidität, offene Posten und Zahlungsfluss auf einen Blick." />

      {/* Kennzahlen-Zeile */}
      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        <StatCard label="Eingänge diesen Monat" value={formatEuro(eingaengeMonat)} iconClassName="success" />
        <StatCard label="Offen" value={formatEuro(offenSumme)} hint={`${offen.length} Rechnungen`} />
        <StatCard label="Überfällig" value={formatEuro(ueberfaelligSumme)} hint={`${ueberfaellig.length} Rechnungen`} iconClassName={ueberfaellig.length ? "destructive" : ""} />
        <StatCard label={`Umsatz ${jahr}`} value={formatEuro(umsatzJahr)} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* Zahlungsfluss */}
        <section className="rounded-xl border bg-card p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="label-caps">Rechnungen vs. Zahlungseingänge · 6 Monate</h2>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-border-strong" /> Rechnungen</span>
              <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-primary" /> Zahlungen</span>
            </div>
          </div>
          <div className="flex h-44 items-end gap-3">
            {monate.map((m) => (
              <div key={m.key} className="group flex min-w-0 flex-1 flex-col items-center gap-1.5">
                <div className="flex h-full w-full items-end justify-center gap-1">
                  <div className="w-[38%] rounded-t-[3px] bg-border-strong" style={{ height: `${Math.max(2, (m.rechnungen / max) * 100)}%` }} title={`Rechnungen ${formatEuro(m.rechnungen)}`} />
                  <div className="w-[38%] rounded-t-[3px] bg-primary" style={{ height: `${Math.max(2, (m.zahlungen / max) * 100)}%` }} title={`Zahlungen ${formatEuro(m.zahlungen)}`} />
                </div>
                <span className="text-[10px] text-muted-foreground">{m.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-3 text-xs sm:grid-cols-6">
            {monate.map((m) => (
              <div key={m.key} className="min-w-0">
                <p className="text-muted-foreground">{m.label}</p>
                <p className="truncate font-medium tabular-nums text-foreground">{formatEuro(m.zahlungen)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Überfällig */}
        <section className="rounded-xl border bg-card">
          <div className="flex items-center justify-between px-4 pb-2 pt-3.5">
            <h2 className="label-caps">Überfällig</h2>
            {ueberfaellig.length > 0 && (
              <Link href="/rechnungslauf" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover">
                <Bell className="h-3.5 w-3.5" /> Mahnlauf
              </Link>
            )}
          </div>
          {ueberfaellig.length === 0 ? (
            <p className="px-4 pb-6 pt-2 text-[13px] text-muted-foreground">Keine überfälligen Rechnungen.</p>
          ) : (
            <ul className="divide-y border-t">
              {ueberfaellig.slice(0, 8).map((r) => {
                const tage = r.faelligkeitsdatum ? Math.max(0, Math.round((Date.parse(heute) - Date.parse(r.faelligkeitsdatum)) / 86400000)) : 0;
                return (
                  <li key={r.id}>
                    <Link href={`/rechnungen/${r.id}`} className="flex items-center gap-3 px-4 py-2 text-[13px] transition-colors hover:bg-surface-muted">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-foreground">
                          {r.fahrschueler ? `${r.fahrschueler.vorname} ${r.fahrschueler.nachname}` : "Ohne Schüler"}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {r.nummer} · {tage} Tage überfällig{r.mahnstufe > 0 ? ` · Mahnstufe ${r.mahnstufe}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums text-destructive">{formatEuro(Number(r.betrag_brutto))}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Letzte Zahlungen */}
        <section className="rounded-xl border bg-card">
          <div className="flex items-center justify-between px-4 pb-2 pt-3.5">
            <h2 className="label-caps">Letzte Zahlungseingänge</h2>
            <Link href="/zahlungen" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover">
              Alle <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {zahlungen.length === 0 ? (
            <p className="px-4 pb-6 pt-2 text-[13px] text-muted-foreground">Noch keine Zahlungen erfasst.</p>
          ) : (
            <ul className="divide-y border-t">
              {zahlungen.slice(0, 6).map((z) => (
                <li key={z.id} className="flex items-center gap-3 px-4 py-2 text-[13px]">
                  <span className="w-[76px] shrink-0 tabular-nums text-muted-foreground">{formatDatum(z.datum)}</span>
                  <span className="min-w-0 flex-1 truncate">{z.fahrschueler ? `${z.fahrschueler.vorname} ${z.fahrschueler.nachname}` : "—"}</span>
                  <Badge variant="secondary">{z.art}</Badge>
                  <span className="shrink-0 font-semibold tabular-nums text-success">+{formatEuro(Number(z.betrag))}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Letzte Rechnungen */}
        <section className="rounded-xl border bg-card">
          <div className="flex items-center justify-between px-4 pb-2 pt-3.5">
            <h2 className="label-caps">Letzte Rechnungen</h2>
            <Link href="/rechnungen" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover">
              Alle <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {rechnungen.length === 0 ? (
            <p className="px-4 pb-6 pt-2 text-[13px] text-muted-foreground">Noch keine Rechnungen.</p>
          ) : (
            <ul className="divide-y border-t">
              {rechnungen.slice(0, 6).map((r) => (
                <li key={r.id}>
                  <Link href={`/rechnungen/${r.id}`} className="flex items-center gap-3 px-4 py-2 text-[13px] transition-colors hover:bg-surface-muted">
                    <span className="w-[76px] shrink-0 tabular-nums text-muted-foreground">{formatDatum(r.rechnungsdatum)}</span>
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium text-foreground">{r.nummer}</span>
                      <span className="text-muted-foreground"> · {r.fahrschueler ? `${r.fahrschueler.vorname} ${r.fahrschueler.nachname}` : "—"}</span>
                    </span>
                    <span className={cn("shrink-0 font-medium tabular-nums", r.status === "bezahlt" ? "text-foreground" : "text-warning")}>
                      {formatEuro(Number(r.betrag_brutto))}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
