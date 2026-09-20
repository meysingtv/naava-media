import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { cn, formatEuro } from "@/lib/utils";
import type { Fahrlehrer, Fahrstunde, Pruefung, Rechnung } from "@/lib/types";

export const metadata = { title: "Berichte · FahrschulApp" };

type Zeitraum = "monat" | "quartal" | "jahr";
const MONATE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function monatsKey(d: Date): string {
  return iso(d).slice(0, 7);
}

/** Aktueller + vorheriger Zeitraum (Start/Ende inkl.). */
function zeitraeume(z: Zeitraum): { akt: [string, string]; vor: [string, string]; label: string; vorLabel: string } {
  const j = new Date();
  const y = j.getFullYear();
  const m = j.getMonth();
  if (z === "jahr") {
    return {
      akt: [`${y}-01-01`, `${y}-12-31`],
      vor: [`${y - 1}-01-01`, `${y - 1}-12-31`],
      label: String(y),
      vorLabel: String(y - 1),
    };
  }
  if (z === "quartal") {
    const q = Math.floor(m / 3);
    const s = new Date(y, q * 3, 1);
    const e = new Date(y, q * 3 + 3, 0);
    const vs = new Date(y, q * 3 - 3, 1);
    const ve = new Date(y, q * 3, 0);
    return { akt: [iso(s), iso(e)], vor: [iso(vs), iso(ve)], label: `Q${q + 1} ${y}`, vorLabel: `Q${((q + 3) % 4) + 1} ${q === 0 ? y - 1 : y}` };
  }
  const s = new Date(y, m, 1);
  const e = new Date(y, m + 1, 0);
  const vs = new Date(y, m - 1, 1);
  const ve = new Date(y, m, 0);
  return { akt: [iso(s), iso(e)], vor: [iso(vs), iso(ve)], label: `${MONATE[m]} ${y}`, vorLabel: `${MONATE[vs.getMonth()]} ${vs.getFullYear()}` };
}

function delta(akt: number, vor: number): { text: string; ton: "up" | "down" | "flat" } {
  if (vor === 0 && akt === 0) return { text: "±0 %", ton: "flat" };
  if (vor === 0) return { text: "neu", ton: "up" };
  const p = Math.round(((akt - vor) / vor) * 100);
  return { text: `${p > 0 ? "+" : ""}${p} %`, ton: p > 0 ? "up" : p < 0 ? "down" : "flat" };
}

function Kennzahl({ label, wert, vor, format = (n: number) => String(n), invers }: { label: string; wert: number; vor: number; format?: (n: number) => string; invers?: boolean }) {
  const d = delta(wert, vor);
  const gut = invers ? d.ton === "down" : d.ton === "up";
  return (
    <div className="border-l-2 border-primary pl-3">
      <p className="label-caps">{label}</p>
      <p className="mt-1 text-[22px] font-semibold leading-7 tabular-nums text-foreground">{format(wert)}</p>
      <p className="text-xs tabular-nums text-muted-foreground">
        <span className={cn("font-medium", d.ton === "flat" ? "text-muted-foreground" : gut ? "text-success" : "text-destructive")}>{d.text}</span>{" "}
        vs. Vorperiode ({format(vor)})
      </p>
    </div>
  );
}

function Balken({ daten, format = (n) => String(n) }: { daten: { key: string; label: string; wert: number }[]; format?: (n: number) => string }) {
  const max = Math.max(1, ...daten.map((d) => d.wert));
  return (
    <div className="flex h-40 items-end gap-1.5">
      {daten.map((d, i) => {
        const h = Math.round((d.wert / max) * 100);
        const letzter = i === daten.length - 1;
        return (
          <div key={d.key} className="group flex min-w-0 flex-1 flex-col items-center gap-1.5" title={format(d.wert)}>
            <div className="relative flex w-full flex-1 items-end">
              <div className={cn("w-full rounded-t-[3px]", letzter ? "bg-primary" : "bg-border-strong group-hover:bg-primary/60")} style={{ height: `${Math.max(h, 2)}%` }} />
            </div>
            <span className="text-[10px] text-muted-foreground">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default async function BerichtePage({ searchParams }: { searchParams: { zeitraum?: string } }) {
  const zeitraum: Zeitraum = searchParams.zeitraum === "jahr" ? "jahr" : searchParams.zeitraum === "quartal" ? "quartal" : "monat";
  const { akt, vor, label, vorLabel } = zeitraeume(zeitraum);
  const supabase = createClient();

  const [rechnungRes, schuelerRes, fahrstundeRes, lehrerRes, pruefungRes] = await Promise.all([
    supabase.from("rechnung").select("rechnungsdatum, betrag_brutto, status").returns<Pick<Rechnung, "rechnungsdatum" | "betrag_brutto" | "status">[]>(),
    supabase.from("fahrschueler").select("anmeldedatum").returns<{ anmeldedatum: string | null }[]>(),
    supabase
      .from("fahrstunde")
      .select("datum, fahrlehrer_id, status, dauer_minuten")
      .gte("datum", vor[0])
      .returns<Pick<Fahrstunde, "datum" | "fahrlehrer_id" | "status" | "dauer_minuten">[]>(),
    supabase.from("fahrlehrer").select("id, vorname, nachname").returns<Pick<Fahrlehrer, "id" | "vorname" | "nachname">[]>(),
    supabase.from("pruefung").select("art, ergebnis, datum").returns<Pick<Pruefung, "art" | "ergebnis" | "datum">[]>(),
  ]);

  const rechnungen = rechnungRes.data ?? [];
  const schueler = schuelerRes.data ?? [];
  const fahrstunden = (fahrstundeRes.data ?? []).filter((f) => f.status !== "ausgefallen");
  const lehrer = lehrerRes.data ?? [];
  const pruefungen = pruefungRes.data ?? [];

  const im = (d: string | null | undefined, r: [string, string]) => !!d && d >= r[0] && d <= r[1];

  const umsatzAkt = rechnungen.filter((r) => im(r.rechnungsdatum, akt)).reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0);
  const umsatzVor = rechnungen.filter((r) => im(r.rechnungsdatum, vor)).reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0);
  const neuAkt = schueler.filter((s) => im(s.anmeldedatum, akt)).length;
  const neuVor = schueler.filter((s) => im(s.anmeldedatum, vor)).length;
  const fsAkt = fahrstunden.filter((f) => im(f.datum, akt)).length;
  const fsVor = fahrstunden.filter((f) => im(f.datum, vor)).length;
  const prAkt = pruefungen.filter((p) => im(p.datum, akt) && p.ergebnis !== "offen");
  const prVor = pruefungen.filter((p) => im(p.datum, vor) && p.ergebnis !== "offen");
  const quoteAkt = prAkt.length ? Math.round((prAkt.filter((p) => p.ergebnis === "bestanden").length / prAkt.length) * 100) : 0;
  const quoteVor = prVor.length ? Math.round((prVor.filter((p) => p.ergebnis === "bestanden").length / prVor.length) * 100) : 0;

  // 12-Monats-Verläufe
  const jetzt = new Date();
  const monate: { key: string; label: string }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(jetzt.getFullYear(), jetzt.getMonth() - i, 1);
    monate.push({ key: monatsKey(d), label: MONATE[d.getMonth()] });
  }
  const umsatzMap: Record<string, number> = {};
  for (const r of rechnungen) if (r.rechnungsdatum) umsatzMap[r.rechnungsdatum.slice(0, 7)] = (umsatzMap[r.rechnungsdatum.slice(0, 7)] ?? 0) + Number(r.betrag_brutto ?? 0);
  const anmeldMap: Record<string, number> = {};
  for (const s of schueler) if (s.anmeldedatum) anmeldMap[s.anmeldedatum.slice(0, 7)] = (anmeldMap[s.anmeldedatum.slice(0, 7)] ?? 0) + 1;

  // Fahrlehrer-Auslastung im Zeitraum
  const lehrerName: Record<string, string> = {};
  for (const l of lehrer) lehrerName[l.id] = `${l.vorname} ${l.nachname}`;
  const lehrerMin: Record<string, number> = {};
  for (const f of fahrstunden) if (f.fahrlehrer_id && im(f.datum, akt)) lehrerMin[f.fahrlehrer_id] = (lehrerMin[f.fahrlehrer_id] ?? 0) + (f.dauer_minuten ?? 45);
  const topLehrer = Object.entries(lehrerMin).map(([id, min]) => ({ name: lehrerName[id] ?? "Unbekannt", std: min / 60 })).sort((a, b) => b.std - a.std).slice(0, 6);
  const maxStd = Math.max(1, ...topLehrer.map((l) => l.std));

  const theorie = prAkt.filter((p) => p.art === "theorie");
  const praxis = prAkt.filter((p) => p.art === "praxis");

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Auswertung" title="Berichte" description={`Kennzahlen für ${label} im Vergleich zu ${vorLabel}.`}>
        <div className="inline-flex rounded-md border bg-card p-0.5 text-xs">
          {(
            [
              ["monat", "Monat"],
              ["quartal", "Quartal"],
              ["jahr", "Jahr"],
            ] as [Zeitraum, string][]
          ).map(([v, l]) => (
            <Link
              key={v}
              href={`/berichte?zeitraum=${v}`}
              className={cn("h-7 rounded-[4px] px-2.5 leading-7 font-medium transition-colors", zeitraum === v ? "bg-primary-soft text-primary-text" : "text-muted-foreground hover:text-foreground")}
            >
              {l}
            </Link>
          ))}
        </div>
      </PageHeader>

      {/* Kennzahlen mit Vergleich */}
      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        <Kennzahl label="Umsatz" wert={umsatzAkt} vor={umsatzVor} format={(n) => formatEuro(n)} />
        <Kennzahl label="Neuanmeldungen" wert={neuAkt} vor={neuVor} />
        <Kennzahl label="Fahrstunden" wert={fsAkt} vor={fsVor} />
        <Kennzahl label="Bestehensquote" wert={quoteAkt} vor={quoteVor} format={(n) => `${n} %`} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-xl bg-card shadow-panel p-4">
          <h2 className="label-caps mb-3">Umsatz · 12 Monate</h2>
          <Balken daten={monate.map((m) => ({ ...m, wert: Math.round(umsatzMap[m.key] ?? 0) }))} format={(n) => formatEuro(n)} />
        </section>
        <section className="rounded-xl bg-card shadow-panel p-4">
          <h2 className="label-caps mb-3">Neuanmeldungen · 12 Monate</h2>
          <Balken daten={monate.map((m) => ({ ...m, wert: anmeldMap[m.key] ?? 0 }))} />
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-xl bg-card shadow-panel p-4">
          <h2 className="label-caps mb-3">Fahrlehrer-Auslastung · {label}</h2>
          {topLehrer.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-muted-foreground">Keine Fahrstunden im Zeitraum.</p>
          ) : (
            <ul className="space-y-2.5">
              {topLehrer.map((l) => (
                <li key={l.name}>
                  <div className="mb-1 flex items-center justify-between text-[13px]">
                    <span className="truncate font-medium text-foreground">{l.name}</span>
                    <span className="tabular-nums text-muted-foreground">{l.std.toFixed(1)} h</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((l.std / maxStd) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl bg-card shadow-panel p-4">
          <h2 className="label-caps mb-3">Prüfungserfolg · {label}</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Theorie", liste: theorie },
              { label: "Praxis", liste: praxis },
            ].map((row) => {
              const best = row.liste.filter((p) => p.ergebnis === "bestanden").length;
              const q = row.liste.length ? Math.round((best / row.liste.length) * 100) : 0;
              return (
                <div key={row.label} className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">{row.label}</p>
                  <p className="mt-1 text-[22px] font-semibold leading-7 tabular-nums text-foreground">{row.liste.length ? `${q} %` : "—"}</p>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {best} von {row.liste.length} bestanden
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                    <div className={cn("h-full rounded-full", q >= 60 ? "bg-success" : "bg-warning")} style={{ width: `${q}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
