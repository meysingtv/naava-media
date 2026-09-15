import Link from "next/link";
import { AlertTriangle, Car, CalendarClock, Gauge, TrendingDown, Users } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { cn, formatEuro } from "@/lib/utils";
import type { Fahrlehrer, Fahrstunde, Fahrzeug, Rechnung } from "@/lib/types";

// Kapazitäts-Annahme für die Auslastung (bis konfigurierbar): planbare
// Fahrstunden-Stunden je Ressource und Woche.
export const KAPAZITAET_STD_WOCHE = 40;

export type CockpitStunde = Pick<Fahrstunde, "datum" | "dauer_minuten" | "status" | "fahrlehrer_id" | "fahrzeug_id">;
export type CockpitLehrer = Pick<Fahrlehrer, "id" | "vorname" | "nachname">;
export type CockpitFahrzeug = Pick<Fahrzeug, "id" | "kennzeichen">;
export type CockpitRechnung = Pick<Rechnung, "betrag_brutto" | "status" | "faelligkeitsdatum" | "rechnungsdatum">;

export interface CockpitProps {
  stunden: CockpitStunde[];
  lehrer: CockpitLehrer[];
  fahrzeuge: CockpitFahrzeug[];
  offene: CockpitRechnung[];
  /** Referenzzeitpunkt (für Tests/Preview); Default = jetzt. */
  jetztIso?: string;
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function wochenStart(base: Date): Date {
  const d = new Date(base);
  const versatz = (d.getDay() + 6) % 7; // Montag = 0
  d.setDate(d.getDate() - versatz);
  d.setHours(0, 0, 0, 0);
  return d;
}
function plusTage(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function Kachel({
  icon: Icon,
  label,
  wert,
  sub,
  ton = "neutral",
}: {
  icon: typeof Gauge;
  label: string;
  wert: string;
  sub?: string;
  ton?: "neutral" | "gut" | "warnung" | "kritisch";
}) {
  const tonKlasse =
    ton === "gut" ? "text-success" : ton === "warnung" ? "text-warning" : ton === "kritisch" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" strokeWidth={1.75} />
        <span className="label-caps">{label}</span>
      </div>
      <p className={cn("text-[26px] font-semibold leading-8 tabular-nums", tonKlasse)}>{wert}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function AuslastungReihe({ name, std, quote }: { name: string; std: number; quote: number }) {
  const ton = quote >= 85 ? "bg-destructive" : quote >= 55 ? "bg-primary" : "bg-warning";
  return (
    <li>
      <div className="mb-1 flex items-center justify-between text-[13px]">
        <span className="min-w-0 truncate font-medium text-foreground">{name}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {std.toFixed(1)} h · <span className="font-medium text-foreground">{quote}%</span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
        <div className={cn("h-full rounded-full", ton)} style={{ width: `${Math.min(quote, 100)}%` }} />
      </div>
    </li>
  );
}

export function CockpitView({ stunden, lehrer, fahrzeuge, offene, jetztIso }: CockpitProps) {
  const jetzt = jetztIso ? new Date(jetztIso) : new Date();
  const heute = iso(jetzt);
  const wStart = wochenStart(jetzt);
  const wEnde = plusTage(wStart, 6);
  const wStartIso = iso(wStart);
  const wEndeIso = iso(wEnde);
  const vor30 = iso(plusTage(jetzt, -30));

  const std = (min: number | null) => (min ?? 45) / 60;
  const dieseWoche = stunden.filter((s) => s.datum >= wStartIso && s.datum <= wEndeIso && s.status !== "ausgefallen");
  const letzte30 = stunden.filter((s) => s.datum >= vor30 && s.datum <= heute);

  // KPI: Auslastung diese Woche (alle Fahrlehrer zusammen)
  const gebuchtStd = dieseWoche.filter((s) => s.fahrlehrer_id).reduce((sum, s) => sum + std(s.dauer_minuten), 0);
  const kapazitaetStd = Math.max(1, lehrer.length * KAPAZITAET_STD_WOCHE);
  const auslastung = Math.round((gebuchtStd / kapazitaetStd) * 100);

  // KPI: No-Show-Quote (30 Tage)
  const relevante30 = letzte30.filter((s) => s.status === "abgeschlossen" || s.status === "ausgefallen");
  const ausfaelle30 = letzte30.filter((s) => s.status === "ausgefallen").length;
  const noShowQuote = relevante30.length ? Math.round((ausfaelle30 / relevante30.length) * 100) : 0;

  // KPI: Fahrstunden diese Woche (Volumen)
  const fsWoche = dieseWoche.length;

  // KPI + Aging: Offene Posten
  const offenerBetrag = offene.reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0);
  const buckets = [
    { key: "nicht", label: "Nicht fällig", betrag: 0, anzahl: 0, ton: "text-foreground", bar: "bg-border-strong" },
    { key: "b30", label: "1–30 Tage", betrag: 0, anzahl: 0, ton: "text-warning", bar: "bg-warning" },
    { key: "b60", label: "31–60 Tage", betrag: 0, anzahl: 0, ton: "text-warning", bar: "bg-warning" },
    { key: "b60p", label: "über 60 Tage", betrag: 0, anzahl: 0, ton: "text-destructive", bar: "bg-destructive" },
  ];
  for (const r of offene) {
    const betrag = Number(r.betrag_brutto ?? 0);
    const faellig = r.faelligkeitsdatum;
    let idx = 0;
    if (faellig && faellig < heute) {
      const tage = Math.floor((jetzt.getTime() - new Date(faellig).getTime()) / 86400000);
      idx = tage <= 30 ? 1 : tage <= 60 ? 2 : 3;
    }
    buckets[idx].betrag += betrag;
    buckets[idx].anzahl += 1;
  }
  const ueberfaelligBetrag = buckets[1].betrag + buckets[2].betrag + buckets[3].betrag;
  const agingMax = Math.max(1, ...buckets.map((b) => b.betrag));

  // Auslastung je Fahrlehrer (diese Woche)
  const lehrerName: Record<string, string> = {};
  for (const l of lehrer) lehrerName[l.id] = `${l.vorname} ${l.nachname}`;
  const lehrerStd: Record<string, number> = {};
  for (const s of dieseWoche) if (s.fahrlehrer_id) lehrerStd[s.fahrlehrer_id] = (lehrerStd[s.fahrlehrer_id] ?? 0) + std(s.dauer_minuten);
  const lehrerAuslastung = lehrer
    .map((l) => ({ name: lehrerName[l.id], std: lehrerStd[l.id] ?? 0, quote: Math.round(((lehrerStd[l.id] ?? 0) / KAPAZITAET_STD_WOCHE) * 100) }))
    .sort((a, b) => b.std - a.std);

  // Auslastung je Fahrzeug (diese Woche)
  const fzKennz: Record<string, string> = {};
  for (const f of fahrzeuge) fzKennz[f.id] = f.kennzeichen;
  const fzStd: Record<string, number> = {};
  for (const s of dieseWoche) if (s.fahrzeug_id) fzStd[s.fahrzeug_id] = (fzStd[s.fahrzeug_id] ?? 0) + std(s.dauer_minuten);
  const fzAuslastung = fahrzeuge
    .map((f) => ({ name: fzKennz[f.id], std: fzStd[f.id] ?? 0, quote: Math.round(((fzStd[f.id] ?? 0) / KAPAZITAET_STD_WOCHE) * 100) }))
    .sort((a, b) => b.std - a.std);

  // No-Show je Fahrlehrer (30 Tage)
  const nsGesamt: Record<string, number> = {};
  const nsAusfall: Record<string, number> = {};
  for (const s of letzte30) {
    if (!s.fahrlehrer_id) continue;
    if (s.status === "abgeschlossen" || s.status === "ausgefallen") nsGesamt[s.fahrlehrer_id] = (nsGesamt[s.fahrlehrer_id] ?? 0) + 1;
    if (s.status === "ausgefallen") nsAusfall[s.fahrlehrer_id] = (nsAusfall[s.fahrlehrer_id] ?? 0) + 1;
  }
  const noShowLehrer = lehrer
    .map((l) => ({ name: lehrerName[l.id], ausfall: nsAusfall[l.id] ?? 0, gesamt: nsGesamt[l.id] ?? 0 }))
    .filter((x) => x.gesamt > 0)
    .map((x) => ({ ...x, quote: Math.round((x.ausfall / x.gesamt) * 100) }))
    .sort((a, b) => b.quote - a.quote);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Auswertung" title="Cockpit" description="Live-Steuerung: Auslastung, Ausfälle und offene Posten auf einen Blick." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kachel
          icon={Gauge}
          label="Auslastung Woche"
          wert={`${auslastung}%`}
          sub={`${gebuchtStd.toFixed(0)} von ${kapazitaetStd} h verplant`}
          ton={auslastung >= 85 ? "kritisch" : auslastung >= 55 ? "gut" : "warnung"}
        />
        <Kachel
          icon={TrendingDown}
          label="No-Show 30 Tage"
          wert={`${noShowQuote}%`}
          sub={`${ausfaelle30} Ausfälle von ${relevante30.length} Terminen`}
          ton={noShowQuote >= 15 ? "kritisch" : noShowQuote >= 8 ? "warnung" : "gut"}
        />
        <Kachel
          icon={CalendarClock}
          label="Fahrstunden Woche"
          wert={String(fsWoche)}
          sub={`${wStart.toLocaleDateString("de-DE", { day: "numeric", month: "short" })} – ${wEnde.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}`}
        />
        <Kachel
          icon={AlertTriangle}
          label="Offene Posten"
          wert={formatEuro(offenerBetrag)}
          sub={`davon ${formatEuro(ueberfaelligBetrag)} überfällig`}
          ton={ueberfaelligBetrag > 0 ? "kritisch" : "neutral"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
            <h2 className="label-caps">Auslastung Fahrlehrer · diese Woche</h2>
          </div>
          {lehrerAuslastung.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-muted-foreground">Keine aktiven Fahrlehrer.</p>
          ) : (
            <ul className="space-y-2.5">
              {lehrerAuslastung.map((l) => (
                <AuslastungReihe key={l.name} name={l.name} std={l.std} quote={l.quote} />
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">Basis: {KAPAZITAET_STD_WOCHE} planbare Std/Woche je Fahrlehrer.</p>
        </section>

        <section className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Car className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
            <h2 className="label-caps">Auslastung Fahrzeuge · diese Woche</h2>
          </div>
          {fzAuslastung.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-muted-foreground">Keine aktiven Fahrzeuge.</p>
          ) : (
            <ul className="space-y-2.5">
              {fzAuslastung.map((f) => (
                <AuslastungReihe key={f.name} name={f.name} std={f.std} quote={f.quote} />
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">Basis: {KAPAZITAET_STD_WOCHE} planbare Std/Woche je Fahrzeug.</p>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="label-caps">Offene Posten nach Alter</h2>
            <Link href="/rechnungslauf" className="text-xs font-medium text-primary hover:text-primary-hover">
              Mahnlauf
            </Link>
          </div>
          <ul className="space-y-2.5">
            {buckets.map((b) => (
              <li key={b.key}>
                <div className="mb-1 flex items-center justify-between text-[13px]">
                  <span className="text-foreground-secondary">{b.label}</span>
                  <span className="tabular-nums">
                    <span className={cn("font-semibold", b.ton)}>{formatEuro(b.betrag)}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{b.anzahl}</span>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
                  <div className={cn("h-full rounded-full", b.bar)} style={{ width: `${Math.round((b.betrag / agingMax) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
            <h2 className="label-caps">Ausfälle je Fahrlehrer · 30 Tage</h2>
          </div>
          {noShowLehrer.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-muted-foreground">Keine abgeschlossenen Termine in den letzten 30 Tagen.</p>
          ) : (
            <ul className="divide-y">
              {noShowLehrer.map((l) => (
                <li key={l.name} className="flex items-center justify-between py-2 text-[13px]">
                  <span className="min-w-0 truncate font-medium text-foreground">{l.name}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {l.ausfall}/{l.gesamt} ·{" "}
                    <span className={cn("font-semibold", l.quote >= 15 ? "text-destructive" : l.quote >= 8 ? "text-warning" : "text-success")}>
                      {l.quote}%
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
