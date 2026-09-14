import { BarChart3, CalendarClock, Euro, TrendingUp, UserPlus, Users } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { cn, formatEuro } from "@/lib/utils";
import type { Fahrlehrer, Fahrstunde, Rechnung } from "@/lib/types";

export const metadata = { title: "Berichte · FahrschulApp" };

const MONATE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

function monatsKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function letzte12(): { key: string; label: string }[] {
  const jetzt = new Date();
  const out: { key: string; label: string }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(jetzt.getFullYear(), jetzt.getMonth() - i, 1);
    out.push({ key: monatsKey(d), label: MONATE[d.getMonth()] });
  }
  return out;
}

/** Vertikales Balkendiagramm (reine CSS-Höhen, kein externes Paket). */
function BalkenChart({
  daten,
  format = (n) => String(n),
  farbe = "bg-primary",
}: {
  daten: { key: string; label: string; wert: number }[];
  format?: (n: number) => string;
  farbe?: string;
}) {
  const max = Math.max(1, ...daten.map((d) => d.wert));
  return (
    <div className="flex h-44 items-end gap-1.5">
      {daten.map((d, i) => {
        const h = Math.round((d.wert / max) * 100);
        const jetzt = i === daten.length - 1;
        return (
          <div key={d.key} className="group flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <div className="relative flex w-full flex-1 items-end">
              <div
                className={cn(
                  "w-full rounded-t-[4px] transition-all",
                  jetzt ? farbe : `${farbe} opacity-45 group-hover:opacity-80`,
                )}
                style={{ height: `${Math.max(h, 2)}%` }}
              />
              <span className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[10px] font-medium text-background opacity-0 transition-opacity group-hover:opacity-100">
                {format(d.wert)}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default async function BerichtePage() {
  const supabase = createClient();
  const jahr = new Date().getFullYear();
  const jahrStart = `${jahr}-01-01`;

  const [rechnungRes, schuelerRes, fahrstundeRes, lehrerRes, pruefungRes] = await Promise.all([
    supabase.from("rechnung").select("rechnungsdatum, betrag_brutto, betrag_netto, status").returns<
      Pick<Rechnung, "rechnungsdatum" | "betrag_brutto" | "betrag_netto" | "status">[]
    >(),
    supabase.from("fahrschueler").select("anmeldedatum"),
    supabase
      .from("fahrstunde")
      .select("datum, fahrlehrer_id, status")
      .gte("datum", jahrStart)
      .returns<Pick<Fahrstunde, "datum" | "fahrlehrer_id" | "status">[]>(),
    supabase.from("fahrlehrer").select("id, vorname, nachname").returns<
      Pick<Fahrlehrer, "id" | "vorname" | "nachname">[]
    >(),
    supabase.from("pruefung").select("art, ergebnis"),
  ]);

  const rechnungen = rechnungRes.data ?? [];
  const schueler = schuelerRes.data ?? [];
  const fahrstunden = fahrstundeRes.data ?? [];
  const lehrer = lehrerRes.data ?? [];
  const pruefungen = (pruefungRes.data ?? []) as { art: string; ergebnis: string }[];

  const monate = letzte12();

  // Umsatz pro Monat (brutto, nach Rechnungsdatum)
  const umsatzMap: Record<string, number> = {};
  for (const r of rechnungen) {
    if (!r.rechnungsdatum) continue;
    const k = r.rechnungsdatum.slice(0, 7);
    umsatzMap[k] = (umsatzMap[k] ?? 0) + Number(r.betrag_brutto ?? 0);
  }
  const umsatzChart = monate.map((m) => ({ ...m, wert: Math.round(umsatzMap[m.key] ?? 0) }));
  const umsatzJahr = rechnungen
    .filter((r) => (r.rechnungsdatum ?? "") >= jahrStart)
    .reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0);

  // Neuanmeldungen pro Monat
  const anmeldMap: Record<string, number> = {};
  for (const s of schueler as { anmeldedatum: string | null }[]) {
    if (!s.anmeldedatum) continue;
    const k = s.anmeldedatum.slice(0, 7);
    anmeldMap[k] = (anmeldMap[k] ?? 0) + 1;
  }
  const anmeldChart = monate.map((m) => ({ ...m, wert: anmeldMap[m.key] ?? 0 }));
  const neuJahr = anmeldChart.reduce((s, m) => s + m.wert, 0);

  // Offene Forderungen
  const offen = rechnungen.filter((r) => r.status === "offen" || r.status === "ueberfaellig");
  const offenerBetrag = offen.reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0);

  // Fahrstunden pro Monat (dieses Jahr)
  const fsMap: Record<string, number> = {};
  for (const f of fahrstunden) {
    if (f.status === "ausgefallen") continue;
    const k = (f.datum ?? "").slice(0, 7);
    if (k) fsMap[k] = (fsMap[k] ?? 0) + 1;
  }
  const fsChart = monate.map((m) => ({ ...m, wert: fsMap[m.key] ?? 0 }));

  // Fahrstunden pro Fahrlehrer (Top)
  const lehrerName: Record<string, string> = {};
  for (const l of lehrer) lehrerName[l.id] = `${l.vorname} ${l.nachname}`;
  const lehrerCount: Record<string, number> = {};
  for (const f of fahrstunden) {
    if (f.status === "ausgefallen" || !f.fahrlehrer_id) continue;
    lehrerCount[f.fahrlehrer_id] = (lehrerCount[f.fahrlehrer_id] ?? 0) + 1;
  }
  const topLehrer = Object.entries(lehrerCount)
    .map(([id, n]) => ({ name: lehrerName[id] ?? "Unbekannt", n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 6);
  const maxLehrer = Math.max(1, ...topLehrer.map((l) => l.n));

  // Bestehensquote
  const abg = pruefungen.filter((p) => p.ergebnis !== "offen");
  const best = abg.filter((p) => p.ergebnis === "bestanden").length;
  const quote = abg.length > 0 ? Math.round((best / abg.length) * 100) : null;
  const theorieAbg = pruefungen.filter((p) => p.art === "theorie" && p.ergebnis !== "offen");
  const theorieBest = theorieAbg.filter((p) => p.ergebnis === "bestanden").length;
  const praxisAbg = pruefungen.filter((p) => p.art === "praxis" && p.ergebnis !== "offen");
  const praxisBest = praxisAbg.filter((p) => p.ergebnis === "bestanden").length;

  return (
    <div className="space-y-6">
      <PageHeader title="Berichte" description={`Auswertungen für ${jahr} – Umsatz, Auslastung, Erfolg.`} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={`Umsatz ${jahr}`} value={formatEuro(umsatzJahr)} icon={Euro} />
        <StatCard label={`Neuanmeldungen ${jahr}`} value={neuJahr} icon={UserPlus} />
        <StatCard
          label="Offene Forderungen"
          value={formatEuro(offenerBetrag)}
          icon={TrendingUp}
          iconClassName={offenerBetrag > 0 ? "bg-warning-soft text-warning" : undefined}
          hint={`${offen.length} Rechnungen`}
        />
        <StatCard
          label="Bestehensquote"
          value={quote != null ? `${quote}%` : "—"}
          icon={BarChart3}
          iconClassName={quote != null && quote >= 60 ? "bg-success-soft text-success" : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="p-5 pb-2">
            <CardTitle className="flex items-center gap-2">
              <Euro className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} /> Umsatz (12 Monate)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-2">
            <BalkenChart daten={umsatzChart} format={(n) => formatEuro(n)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-5 pb-2">
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} /> Neuanmeldungen (12 Monate)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-2">
            <BalkenChart daten={anmeldChart} farbe="bg-accent-bright" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-5 pb-2">
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} /> Fahrstunden pro Monat
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-2">
            <BalkenChart daten={fsChart} farbe="bg-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-5 pb-2">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} /> Fahrstunden je Fahrlehrer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-5 pt-3">
            {topLehrer.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Noch keine Fahrstunden erfasst.</p>
            ) : (
              topLehrer.map((l) => (
                <div key={l.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate font-medium text-foreground">{l.name}</span>
                    <span className="text-muted-foreground tabular-nums">{l.n}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.round((l.n / maxLehrer) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-5 pb-2">
          <CardTitle>Prüfungserfolg nach Art</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 p-5 pt-3 sm:grid-cols-2">
          {[
            { label: "Theorieprüfung", best: theorieBest, ges: theorieAbg.length },
            { label: "Praktische Prüfung", best: praxisBest, ges: praxisAbg.length },
          ].map((row) => {
            const q = row.ges > 0 ? Math.round((row.best / row.ges) * 100) : 0;
            return (
              <div key={row.label} className="rounded-lg border p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{row.label}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {row.best}/{row.ges}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className={cn("h-full rounded-full", q >= 60 ? "bg-success" : "bg-warning")}
                    style={{ width: `${q}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">{row.ges > 0 ? `${q}% bestanden` : "Noch keine Ergebnisse"}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
