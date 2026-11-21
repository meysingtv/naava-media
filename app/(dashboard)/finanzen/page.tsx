import Link from "next/link";
import { AlertTriangle, Banknote, BellRing, CalendarClock, Clock3, ListChecks, TrendingUp } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Karte, KarteLeer, KartenLink } from "@/components/ui/karte";
import { Kennzahl, KennzahlReihe } from "@/components/ui/kennzahl";
import { Monatsverlauf } from "@/components/shared/monatsverlauf";
import { PageHeader } from "@/components/shared/page-header";
import { ZAHLARTEN } from "@/lib/constants";
import { AKZENT } from "@/lib/farben";
import { monatsWerte } from "@/lib/finanzen";
import { formatDatum, formatEuro } from "@/lib/utils";
import { heuteBerlin, plusTage, tageBis } from "@/lib/zeit";
import { siehtUmsatz } from "@/lib/zugriff";
import type { Fahrschueler, Rechnung, Zahlung } from "@/lib/types";

export const metadata = { title: "Finanzen · FahrschulApp" };

type RechnungRow = Pick<Rechnung, "id" | "nummer" | "betrag_brutto" | "status" | "rechnungsdatum" | "faelligkeitsdatum" | "mahnstufe"> & {
  fahrschueler: Pick<Fahrschueler, "vorname" | "nachname"> | null;
};
type ZahlungRow = Pick<Zahlung, "id" | "betrag" | "datum" | "art"> & {
  fahrschueler: Pick<Fahrschueler, "vorname" | "nachname"> | null;
};

/** Altersstufen offener Posten – von „noch nicht fällig" bis „über 90 Tage". */
const STUFEN = [
  { key: "offen", label: "Noch nicht fällig", farbe: "#C9D6FA", von: -Infinity, bis: 0 },
  { key: "30", label: "1–30 Tage überfällig", farbe: AKZENT.orange, von: 1, bis: 30 },
  { key: "60", label: "31–60 Tage", farbe: "#E0643A", von: 31, bis: 60 },
  { key: "90", label: "61–90 Tage", farbe: AKZENT.rot, von: 61, bis: 90 },
  { key: "mehr", label: "Über 90 Tage", farbe: "#A3232A", von: 91, bis: Infinity },
] as const;

const name = (s: { vorname: string; nachname: string } | null) => (s ? `${s.vorname} ${s.nachname}` : "Ohne Schüler");

function prozent(wert: number, basis: number): string {
  return basis > 0 ? `${Math.round((wert / basis) * 100)} %` : "0 %";
}

export default async function FinanzenPage() {
  const supabase = createClient();
  const chef = await siehtUmsatz();
  const heute = heuteBerlin();
  const jahr = heute.slice(0, 4);
  const monat = heute.slice(0, 7);
  const [j, m] = heute.split("-").map(Number);
  // Vergleich mit dem Vormonat bis zum selben Tag
  const vormonat = new Date(Date.UTC(j, m - 2, 1)).toISOString().slice(0, 7);
  const vormonatBis = `${vormonat}-${heute.slice(8)}`;
  const vorjahrBis = `${Number(jahr) - 1}${heute.slice(4)}`;

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
  const summeR = (liste: RechnungRow[]) => liste.reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0);
  const summeZ = (liste: ZahlungRow[]) => liste.reduce((s, z) => s + Number(z.betrag ?? 0), 0);

  const offen = rechnungen.filter((r) => r.status !== "bezahlt");
  const ueberfaelligTage = (r: RechnungRow) => (r.faelligkeitsdatum ? -tageBis(r.faelligkeitsdatum, heute) : r.status === "ueberfaellig" ? 1 : 0);
  const ueberfaellig = offen.filter((r) => ueberfaelligTage(r) > 0).sort((a, b) => ueberfaelligTage(b) - ueberfaelligTage(a));

  const eingangMonat = summeZ(zahlungen.filter((z) => z.datum.startsWith(monat)));
  const eingangVormonat = summeZ(zahlungen.filter((z) => z.datum >= `${vormonat}-01` && z.datum <= vormonatBis));
  const umsatzJahr = summeR(rechnungen.filter((r) => (r.rechnungsdatum ?? "").startsWith(jahr)));
  const umsatzVorjahr = summeR(rechnungen.filter((r) => (r.rechnungsdatum ?? "") >= `${Number(jahr) - 1}-01-01` && (r.rechnungsdatum ?? "") <= vorjahrBis));
  const veraenderung = (jetzt: number, vorher: number) => (vorher > 0 ? ((jetzt - vorher) / vorher) * 100 : null);
  const vMonat = veraenderung(eingangMonat, eingangVormonat);
  const vJahr = veraenderung(umsatzJahr, umsatzVorjahr);

  const monate = monatsWerte(heute, 12, rechnungen, zahlungen);

  // Offene Posten nach Alter
  const stufen = STUFEN.map((st) => {
    const liste = offen.filter((r) => {
      const t = ueberfaelligTage(r);
      return t >= st.von && t <= st.bis;
    });
    return { ...st, anzahl: liste.length, summe: summeR(liste) };
  });
  const summeOffen = summeR(offen);

  // Einnahmen nach Zahlart (laufendes Jahr)
  const zahlungenJahr = zahlungen.filter((z) => z.datum.startsWith(jahr));
  const summeJahr = summeZ(zahlungenJahr);
  const nachArt = Object.entries(ZAHLARTEN)
    .map(([key, label]) => ({ key, label, summe: summeZ(zahlungenJahr.filter((z) => z.art === key)) }))
    .sort((a, b) => b.summe - a.summe);

  const monatName = new Date(`${heute}T12:00:00Z`).toLocaleDateString("de-DE", { month: "long", timeZone: "UTC" });
  const gemahnt = offen.filter((r) => r.mahnstufe > 0);
  const baldFaellig = offen
    .filter((r) => r.faelligkeitsdatum && r.faelligkeitsdatum >= heute && r.faelligkeitsdatum <= plusTage(heute, 14))
    .sort((a, b) => (a.faelligkeitsdatum ?? "").localeCompare(b.faelligkeitsdatum ?? ""));

  const offenKennzahl = (
    <Kennzahl
      label="Offen"
      wert={formatEuro(summeOffen)}
      sub={`${offen.length} ${offen.length === 1 ? "Rechnung" : "Rechnungen"}`}
      icon={Clock3}
      akzent={AKZENT.orange}
      href="/rechnungen"
    />
  );
  const ueberfaelligKennzahl = (
    <Kennzahl
      label="Überfällig"
      wert={formatEuro(summeR(ueberfaellig))}
      sub={`${ueberfaellig.length} ${ueberfaellig.length === 1 ? "Rechnung" : "Rechnungen"}`}
      ton={ueberfaellig.length ? "kritisch" : undefined}
      icon={AlertTriangle}
      akzent={AKZENT.rot}
      href="/rechnungslauf"
    />
  );

  const alterKarte = (
    <Karte titel="Offene Posten nach Alter" meta={formatEuro(summeOffen)} inhaltClassName="px-5 pb-5">
      {offen.length === 0 ? (
        <KarteLeer>Keine offenen Rechnungen.</KarteLeer>
      ) : (
        <>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            {stufen
              .filter((s) => s.summe > 0)
              .map((s) => (
                <span key={s.key} className="h-full" style={{ width: `${(s.summe / summeOffen) * 100}%`, background: s.farbe }} />
              ))}
          </div>
          <ul className="mt-4 space-y-3">
            {stufen.map((s) => (
              <li key={s.key} className="flex items-center gap-3 text-13">
                <i className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.farbe }} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-foreground-secondary">{s.label}</span>
                <span className="shrink-0 tabular-nums text-foreground-tertiary">{s.anzahl}</span>
                <span className="w-24 shrink-0 text-right font-semibold tabular-nums text-foreground">{formatEuro(s.summe)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Karte>
  );

  const ueberfaelligKarte = (className?: string) => (
    <Karte
      titel="Überfällige Rechnungen"
      className={className}
      meta={ueberfaellig.length ? String(ueberfaellig.length) : undefined}
      aktion={<KartenLink href="/rechnungen">Alle Rechnungen</KartenLink>}
      inhaltClassName="flex flex-col pb-4"
    >
      {ueberfaellig.length === 0 ? (
        <KarteLeer>Keine Rechnung ist überfällig.</KarteLeer>
      ) : (
        <>
          <ul className="divide-y divide-border border-t border-border">
            {ueberfaellig.slice(0, 6).map((r) => {
              const tage = ueberfaelligTage(r);
              return (
                <li key={r.id}>
                  <Link href={`/rechnungen/${r.id}`} className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-surface-muted">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-13 font-semibold text-foreground">{name(r.fahrschueler)}</span>
                      <span className="block truncate text-xs text-foreground-secondary">
                        {r.nummer} · seit {tage} {tage === 1 ? "Tag" : "Tagen"}
                        {r.mahnstufe > 0 ? ` · ${r.mahnstufe}. Mahnung` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-13 font-semibold tabular-nums text-destructive-text">{formatEuro(Number(r.betrag_brutto))}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-auto px-5 pt-3">
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/rechnungslauf">
                <ListChecks /> Mahnlauf starten
              </Link>
            </Button>
          </div>
        </>
      )}
    </Karte>
  );

  const zahlungenKarte = (className?: string) => (
    <Karte titel="Letzte Zahlungseingänge" className={className} aktion={<KartenLink href="/zahlungen">Alle Zahlungen</KartenLink>} inhaltClassName="pb-2">
      {zahlungen.length === 0 ? (
        <KarteLeer>Noch keine Zahlungen erfasst.</KarteLeer>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {zahlungen.slice(0, 6).map((z) => (
            <li key={z.id} className="flex items-center gap-3 px-5 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-13 font-semibold text-foreground">{name(z.fahrschueler)}</span>
                <span className="block truncate text-xs text-foreground-secondary">
                  {formatDatum(z.datum)} · {ZAHLARTEN[z.art] ?? z.art}
                </span>
              </span>
              <span className="shrink-0 text-13 font-semibold tabular-nums text-foreground">{formatEuro(Number(z.betrag))}</span>
            </li>
          ))}
        </ul>
      )}
    </Karte>
  );

  const baldKarte = (
    <Karte titel="Bald fällig" meta="nächste 14 Tage" aktion={<KartenLink href="/rechnungen">Alle Rechnungen</KartenLink>} inhaltClassName="pb-2">
      {baldFaellig.length === 0 ? (
        <KarteLeer>In den nächsten 14 Tagen wird keine Rechnung fällig.</KarteLeer>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {baldFaellig.slice(0, 6).map((r) => (
            <li key={r.id}>
              <Link href={`/rechnungen/${r.id}`} className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-surface-muted">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-13 font-semibold text-foreground">{name(r.fahrschueler)}</span>
                  <span className="block truncate text-xs text-foreground-secondary">
                    {r.nummer} · fällig {r.faelligkeitsdatum ? formatDatum(r.faelligkeitsdatum) : "—"}
                  </span>
                </span>
                <span className="shrink-0 text-13 font-semibold tabular-nums text-foreground">{formatEuro(Number(r.betrag_brutto))}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Karte>
  );

  return (
    <div>
      <PageHeader title="Finanzen" />

      <div className="space-y-6">
        {chef ? (
          <KennzahlReihe>
            <Kennzahl
              label={`Eingänge im ${monatName}`}
              wert={formatEuro(eingangMonat)}
              veraenderung={vMonat != null ? { wert: vMonat, label: "ggü. Vormonatszeitraum" } : undefined}
              sub={vMonat == null ? "Zahlungseingänge" : undefined}
              icon={Banknote}
              akzent={AKZENT.smaragd}
              href="/zahlungen"
            />
            {offenKennzahl}
            {ueberfaelligKennzahl}
            <Kennzahl
              label={`Umsatz ${jahr}`}
              wert={formatEuro(umsatzJahr)}
              veraenderung={vJahr != null ? { wert: vJahr, label: "ggü. Vorjahreszeitraum" } : undefined}
              sub={vJahr == null ? "gestellte Rechnungen" : undefined}
              icon={TrendingUp}
              akzent={AKZENT.blau}
            />
          </KennzahlReihe>
        ) : (
          <KennzahlReihe>
            {offenKennzahl}
            {ueberfaelligKennzahl}
            <Kennzahl
              label="Gemahnt"
              wert={gemahnt.length}
              sub={`${gemahnt.filter((r) => r.mahnstufe >= 2).length} in der 2. Stufe oder höher`}
              icon={BellRing}
              akzent={AKZENT.violett}
              href="/rechnungslauf"
            />
            <Kennzahl
              label="Bald fällig"
              wert={baldFaellig.length}
              sub={baldFaellig.length ? `${formatEuro(summeR(baldFaellig))} in 14 Tagen` : "Nichts in den nächsten 14 Tagen"}
              icon={CalendarClock}
              akzent={AKZENT.blau}
              href="/rechnungen"
            />
          </KennzahlReihe>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {chef ? (
            <Karte titel="Einnahmen und Rechnungen" meta="letzte 12 Monate" className="xl:col-span-2" inhaltClassName="px-5 pb-5">
              <Monatsverlauf monate={monate} />
            </Karte>
          ) : (
            ueberfaelligKarte("xl:col-span-2")
          )}
          {alterKarte}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {chef && ueberfaelligKarte()}
          {zahlungenKarte(chef ? undefined : "xl:col-span-2")}
          {chef ? (
            <Karte titel="Einnahmen nach Zahlart" meta={jahr} inhaltClassName="px-5 pb-5">
              {summeJahr === 0 ? (
                <KarteLeer>In diesem Jahr noch keine Zahlungen.</KarteLeer>
              ) : (
                <ul className="space-y-4">
                  {nachArt.map((a) => (
                    <li key={a.key}>
                      <div className="flex items-baseline justify-between gap-3 text-13">
                        <span className="text-foreground-secondary">{a.label}</span>
                        <span className="tabular-nums">
                          <span className="font-semibold text-foreground">{formatEuro(a.summe)}</span>
                          <span className="ml-2 text-foreground-tertiary">{prozent(a.summe, summeJahr)}</span>
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full" style={{ width: `${(a.summe / summeJahr) * 100}%`, background: AKZENT.blau }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Karte>
          ) : (
            baldKarte
          )}
        </div>
      </div>
    </div>
  );
}
