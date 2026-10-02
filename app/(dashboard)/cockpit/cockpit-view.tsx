import { CalendarClock, Gauge, TrendingDown, Wallet } from "lucide-react";

import { Karte, KarteLeer, KartenLink } from "@/components/ui/karte";
import { Kennzahl, KennzahlReihe } from "@/components/ui/kennzahl";
import { Balken } from "@/components/ui/fortschritt";
import { Kennzeichen } from "@/components/shared/kennzeichen";
import { PageHeader } from "@/components/shared/page-header";
import { Saeulen } from "@/components/shared/saeulen";
import { AKZENT } from "@/lib/farben";
import { formatDatum, formatEuro } from "@/lib/utils";
import { plusTage, wochenbeginn, wochentagKurz } from "@/lib/zeit";
import type { Fahrlehrer, Fahrstunde, Fahrzeug, Rechnung } from "@/lib/types";

/** Planbare Stunden je Fahrlehrer bzw. Fahrzeug und Woche – Grundlage der Auslastung. */
const KAPAZITAET_STD_WOCHE = 40;

export type CockpitStunde = Pick<Fahrstunde, "datum" | "dauer_minuten" | "status" | "fahrlehrer_id" | "fahrzeug_id">;
export type CockpitLehrer = Pick<Fahrlehrer, "id" | "vorname" | "nachname">;
export type CockpitFahrzeug = Pick<Fahrzeug, "id" | "kennzeichen" | "name">;
export type CockpitRechnung = Pick<Rechnung, "betrag_brutto" | "status" | "faelligkeitsdatum" | "rechnungsdatum">;

export interface CockpitProps {
  stunden: CockpitStunde[];
  lehrer: CockpitLehrer[];
  fahrzeuge: CockpitFahrzeug[];
  offene: CockpitRechnung[];
  heute: string;
}

/** Farbe der Auslastung: zu wenig (orange), gut (blau), am Limit (rot). */
function auslastungsFarbe(quote: number): string {
  return quote >= 85 ? AKZENT.rot : quote >= 45 ? AKZENT.blau : AKZENT.orange;
}

function AuslastungListe({
  eintraege,
  leer,
}: {
  eintraege: { key: string; name: React.ReactNode; std: number; quote: number }[];
  leer: string;
}) {
  if (eintraege.length === 0) return <KarteLeer>{leer}</KarteLeer>;
  return (
    <ul className="space-y-4">
      {eintraege.map((e) => (
        <li key={e.key}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-13">
            <span className="min-w-0 truncate font-medium text-foreground">{e.name}</span>
            <span className="shrink-0 tabular-nums text-foreground-secondary">
              {e.std.toLocaleString("de-DE", { maximumFractionDigits: 1 })} Std. ·{" "}
              <span className="font-semibold text-foreground">{e.quote} %</span>
            </span>
          </div>
          <Balken anteil={e.quote / 100} farbe={auslastungsFarbe(e.quote)} />
        </li>
      ))}
    </ul>
  );
}

export function CockpitView({ stunden, lehrer, fahrzeuge, offene, heute }: CockpitProps) {
  const montag = wochenbeginn(heute);
  const sonntag = plusTage(montag, 6);
  const vor30 = plusTage(heute, -30);
  const std = (min: number | null) => (min ?? 45) / 60;

  const dieseWoche = stunden.filter((s) => s.datum >= montag && s.datum <= sonntag && s.status !== "ausgefallen");
  const letzte30 = stunden.filter((s) => s.datum >= vor30 && s.datum <= heute);

  // Auslastung diese Woche (alle Fahrlehrer zusammen)
  const gebuchtStd = dieseWoche.filter((s) => s.fahrlehrer_id).reduce((sum, s) => sum + std(s.dauer_minuten), 0);
  const kapazitaetStd = Math.max(1, lehrer.length * KAPAZITAET_STD_WOCHE);
  const auslastung = Math.round((gebuchtStd / kapazitaetStd) * 100);

  // Ausfallquote der letzten 30 Tage
  const relevante30 = letzte30.filter((s) => s.status === "abgeschlossen" || s.status === "ausgefallen");
  const ausfaelle30 = letzte30.filter((s) => s.status === "ausgefallen").length;
  const ausfallQuote = relevante30.length ? Math.round((ausfaelle30 / relevante30.length) * 100) : 0;

  // Offene Posten
  const offenerBetrag = offene.reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0);
  const ueberfaelligBetrag = offene
    .filter((r) => r.status === "ueberfaellig" || (r.faelligkeitsdatum != null && r.faelligkeitsdatum < heute))
    .reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0);

  // Auslastung je Fahrlehrer und je Fahrzeug (diese Woche)
  const summeJe = (feld: "fahrlehrer_id" | "fahrzeug_id") => {
    const m: Record<string, number> = {};
    for (const s of dieseWoche) {
      const id = s[feld];
      if (id) m[id] = (m[id] ?? 0) + std(s.dauer_minuten);
    }
    return m;
  };
  const lehrerStd = summeJe("fahrlehrer_id");
  const fzStd = summeJe("fahrzeug_id");
  const quote = (h: number) => Math.round((h / KAPAZITAET_STD_WOCHE) * 100);
  const lehrerAuslastung = lehrer
    .map((l) => ({ key: l.id, name: `${l.vorname} ${l.nachname}`, std: lehrerStd[l.id] ?? 0, quote: quote(lehrerStd[l.id] ?? 0) }))
    .sort((a, b) => b.std - a.std);
  const fzAuslastung = fahrzeuge
    .map((f) => ({
      key: f.id,
      name: (
        <span className="flex items-center gap-2">
          <Kennzeichen>{f.kennzeichen}</Kennzeichen>
          {f.name && <span className="truncate font-normal text-foreground-secondary">{f.name}</span>}
        </span>
      ),
      std: fzStd[f.id] ?? 0,
      quote: quote(fzStd[f.id] ?? 0),
    }))
    .sort((a, b) => b.std - a.std);

  // Ausfälle je Fahrlehrer (30 Tage)
  const ausfallJe = lehrer
    .map((l) => {
      const eigene = letzte30.filter((s) => s.fahrlehrer_id === l.id && (s.status === "abgeschlossen" || s.status === "ausgefallen"));
      const ausfall = eigene.filter((s) => s.status === "ausgefallen").length;
      return { key: l.id, name: `${l.vorname} ${l.nachname}`, ausfall, gesamt: eigene.length };
    })
    .filter((x) => x.gesamt > 0)
    .map((x) => ({ ...x, quote: Math.round((x.ausfall / x.gesamt) * 100) }))
    .sort((a, b) => b.quote - a.quote);

  // Vorschau: verplante Stunden an den nächsten zehn Tagen
  const vorschau = Array.from({ length: 10 }, (_, i) => {
    const tag = plusTage(heute, i);
    const h = stunden.filter((s) => s.datum === tag && s.status !== "ausgefallen").reduce((sum, s) => sum + std(s.dauer_minuten), 0);
    return { schluessel: tag, label: i === 0 ? "Heute" : wochentagKurz(tag), wert: Math.round(h) };
  });

  return (
    <div>
      <PageHeader title="Cockpit" />

      <div className="space-y-6">
        <KennzahlReihe>
          <Kennzahl
            label="Auslastung diese Woche"
            wert={`${auslastung} %`}
            anteil={auslastung / 100}
            sub={`${Math.round(gebuchtStd)} von ${kapazitaetStd} Std. verplant`}
            icon={Gauge}
            akzent={auslastungsFarbe(auslastung)}
          />
          <Kennzahl
            label="Ausfallquote 30 Tage"
            wert={`${ausfallQuote} %`}
            sub={`${ausfaelle30} Ausfälle bei ${relevante30.length} Terminen`}
            ton={ausfallQuote >= 15 ? "kritisch" : ausfallQuote >= 8 ? "warnung" : undefined}
            icon={TrendingDown}
            akzent={AKZENT.orange}
          />
          <Kennzahl
            label="Fahrstunden diese Woche"
            wert={dieseWoche.length}
            sub={`${Math.round(gebuchtStd)} Std. · ${formatDatum(montag).slice(0, 6)} bis ${formatDatum(sonntag).slice(0, 6)}`}
            icon={CalendarClock}
            akzent={AKZENT.blau}
            href="/kalender"
          />
          <Kennzahl
            label="Offene Posten"
            wert={formatEuro(offenerBetrag)}
            sub={ueberfaelligBetrag > 0 ? `davon ${formatEuro(ueberfaelligBetrag)} überfällig` : "Nichts überfällig"}
            ton={ueberfaelligBetrag > 0 ? "kritisch" : undefined}
            icon={Wallet}
            akzent={AKZENT.rot}
            href="/finanzen"
          />
        </KennzahlReihe>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Karte titel="Auslastung Fahrlehrer" meta="diese Woche" inhaltClassName="px-5 pb-5">
            <AuslastungListe eintraege={lehrerAuslastung} leer="Keine aktiven Fahrlehrer." />
          </Karte>
          <Karte titel="Auslastung Fahrzeuge" meta="diese Woche" aktion={<KartenLink href="/fahrzeuge">Fahrzeuge</KartenLink>} inhaltClassName="px-5 pb-5">
            <AuslastungListe eintraege={fzAuslastung} leer="Keine aktiven Fahrzeuge." />
          </Karte>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Karte titel="Verplante Stunden" meta="nächste 10 Tage" aktion={<KartenLink href="/kalender">Kalender</KartenLink>} className="xl:col-span-2" inhaltClassName="px-5 pb-5">
            <Saeulen werte={vorschau} hervorheben={heute} label="Verplante Fahrstunden in den nächsten zehn Tagen" hoehe={180} />
          </Karte>

          <Karte titel="Ausfälle je Fahrlehrer" meta="30 Tage" inhaltClassName="pb-2">
            {ausfallJe.length === 0 ? (
              <KarteLeer>Keine abgeschlossenen Termine in den letzten 30 Tagen.</KarteLeer>
            ) : (
              <ul className="divide-y divide-border border-t border-border">
                {ausfallJe.map((l) => (
                  <li key={l.key} className="flex items-center justify-between gap-3 px-5 py-2.5 text-13">
                    <span className="min-w-0 truncate font-medium text-foreground">{l.name}</span>
                    <span className="shrink-0 tabular-nums text-foreground-secondary">
                      {l.ausfall} von {l.gesamt} ·{" "}
                      <span className={l.quote >= 15 ? "font-semibold text-destructive-text" : l.quote >= 8 ? "font-semibold text-warning-text" : "font-semibold text-foreground"}>
                        {l.quote} %
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Karte>
        </div>

        <p className="text-xs text-foreground-tertiary">Auslastung bezogen auf {KAPAZITAET_STD_WOCHE} planbare Stunden je Fahrlehrer und Fahrzeug pro Woche.</p>
      </div>
    </div>
  );
}
