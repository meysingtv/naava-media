import Link from "next/link";
import { AlertTriangle, Banknote, BellRing, CalendarClock, Clock3, FileText, ListChecks } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Karte, KarteLeer, KartenLink } from "@/components/ui/karte";
import { Kennzahl, KennzahlReihe } from "@/components/ui/kennzahl";
import { AKZENT } from "@/lib/farben";
import { formatDatum, formatEuro } from "@/lib/utils";
import { plusTage } from "./zeit";

type OffeneRow = {
  id: string;
  nummer: string;
  betrag_brutto: number | null;
  status: string;
  faelligkeitsdatum: string | null;
  mahnstufe: number;
  rechnungsdatum: string;
  fahrschueler: { id: string; vorname: string; nachname: string } | null;
};
type RateRow = {
  id: string;
  betrag: number;
  faellig_am: string | null;
  notiz: string | null;
  schueler_id: string;
  fahrschueler: { id: string; vorname: string; nachname: string } | null;
};
type ZahlungRow = {
  id: string;
  betrag: number;
  datum: string;
  art: string;
  fahrschueler: { vorname: string; nachname: string } | null;
  rechnung: { nummer: string } | null;
};

const ZAHLART: Record<string, string> = { bar: "Bar", ueberweisung: "Überweisung", lastschrift: "Lastschrift", karte: "Karte" };

function tageZwischen(von: string, bis: string): number {
  return Math.round((new Date(`${bis}T12:00:00Z`).getTime() - new Date(`${von}T12:00:00Z`).getTime()) / 86_400_000);
}

/** Rundet auf eine „schöne" Obergrenze für die Achse (100, 250, 500, 1.000 …). */
function schoeneObergrenze(wert: number): number {
  if (wert <= 0) return 100;
  const basis = Math.pow(10, Math.floor(Math.log10(wert)));
  const n = wert / basis;
  const stufe = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return stufe * basis;
}

function euroKurz(wert: number): string {
  return `${wert.toLocaleString("de-DE", { maximumFractionDigits: 0 })} €`;
}

function Name({ s }: { s: { vorname: string; nachname: string } | null }) {
  return <>{s ? `${s.vorname} ${s.nachname}` : "Ohne Schüler"}</>;
}

/**
 * Finanzen im Dashboard.
 * - `voll` (Geschäftsführung): Eingänge, gestellte Beträge, offene und
 *   überfällige Rechnungen, Verlauf der letzten sechs Monate, Zahlungen.
 * - `posten` (Büro): nur die Arbeit – überfällige und bald fällige
 *   Rechnungen, Mahnungen, fällige Raten. Keine Einnahmen, kein Umsatz.
 */
export async function AnsichtFinanzen({ variante, heute }: { variante: "voll" | "posten"; heute: string }) {
  const supabase = createClient();
  const voll = variante === "voll";
  const [jahr, monat] = heute.split("-").map(Number);
  const monatsbeginn = `${heute.slice(0, 7)}-01`;
  const sechsMonate = new Date(Date.UTC(jahr, monat - 6, 1)).toISOString().slice(0, 10);
  const vormonatBeginn = new Date(Date.UTC(jahr, monat - 2, 1)).toISOString().slice(0, 10);
  const vormonatStichtag = (() => {
    const letzter = new Date(Date.UTC(jahr, monat - 1, 0)).getUTCDate();
    const tag = Math.min(Number(heute.slice(8)), letzter);
    return `${vormonatBeginn.slice(0, 8)}${String(tag).padStart(2, "0")}`;
  })();

  const leer = <T,>() => Promise.resolve({ data: [] as T[] });

  const [offeneRes, ratenRes, gestelltRes, eingangRes, letzteRes] = await Promise.all([
    supabase
      .from("rechnung")
      .select("id, nummer, betrag_brutto, status, faelligkeitsdatum, mahnstufe, rechnungsdatum, fahrschueler(id, vorname, nachname)")
      .neq("status", "bezahlt")
      .order("faelligkeitsdatum", { ascending: true, nullsFirst: false })
      .returns<OffeneRow[]>(),
    supabase
      .from("rate")
      .select("id, betrag, faellig_am, notiz, schueler_id, fahrschueler(id, vorname, nachname)")
      .eq("bezahlt", false)
      .lte("faellig_am", plusTage(heute, 14))
      .order("faellig_am", { ascending: true })
      .returns<RateRow[]>(),
    voll
      ? supabase
          .from("rechnung")
          .select("betrag_brutto, rechnungsdatum")
          .gte("rechnungsdatum", sechsMonate)
          .returns<{ betrag_brutto: number | null; rechnungsdatum: string }[]>()
      : leer<{ betrag_brutto: number | null; rechnungsdatum: string }>(),
    voll
      ? supabase.from("zahlung").select("betrag, datum").gte("datum", sechsMonate).returns<{ betrag: number; datum: string }[]>()
      : leer<{ betrag: number; datum: string }>(),
    voll
      ? supabase
          .from("zahlung")
          .select("id, betrag, datum, art, fahrschueler(vorname, nachname), rechnung(nummer)")
          .order("datum", { ascending: false })
          .limit(5)
          .returns<ZahlungRow[]>()
      : leer<ZahlungRow>(),
  ]);

  const offene = offeneRes.data ?? [];
  const raten = ratenRes.data ?? [];
  const summe = (liste: { betrag_brutto: number | null }[]) => liste.reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0);
  const istUeberfaellig = (r: OffeneRow) => r.status === "ueberfaellig" || Boolean(r.faelligkeitsdatum && r.faelligkeitsdatum < heute);
  const ueberfaellig = offene.filter(istUeberfaellig);
  const baldFaellig = offene.filter((r) => !istUeberfaellig(r) && r.faelligkeitsdatum && r.faelligkeitsdatum <= plusTage(heute, 14));
  const gemahnt = offene.filter((r) => r.mahnstufe > 0);
  const ratenSumme = raten.reduce((s, r) => s + Number(r.betrag ?? 0), 0);

  // ---------------------------------------------------------------- Verlauf (nur Geschäftsführung)
  const eingaenge = eingangRes.data ?? [];
  const gestellt = gestelltRes.data ?? [];
  const monate = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(jahr, monat - 6 + i, 1));
    const schluessel = d.toISOString().slice(0, 7);
    return {
      schluessel,
      label: d.toLocaleDateString("de-DE", { month: "short", timeZone: "UTC" }).replace(".", ""),
      gestellt: gestellt.filter((r) => r.rechnungsdatum.startsWith(schluessel)).reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0),
      eingang: eingaenge.filter((z) => z.datum.startsWith(schluessel)).reduce((s, z) => s + Number(z.betrag ?? 0), 0),
    };
  });
  const dieserMonat = monate[monate.length - 1];
  const eingangVormonatGleicherStand = eingaenge
    .filter((z) => z.datum >= vormonatBeginn && z.datum <= vormonatStichtag)
    .reduce((s, z) => s + Number(z.betrag ?? 0), 0);
  const veraenderung =
    eingangVormonatGleicherStand > 0 ? ((dieserMonat.eingang - eingangVormonatGleicherStand) / eingangVormonatGleicherStand) * 100 : null;
  const achsenMax = schoeneObergrenze(Math.max(...monate.map((m) => Math.max(m.gestellt, m.eingang))));
  const summeEingang = monate.reduce((s, m) => s + m.eingang, 0);
  const summeGestellt = monate.reduce((s, m) => s + m.gestellt, 0);

  // ---------------------------------------------------------------- Bausteine
  const ueberfaelligKarte = (
    <Karte
      titel="Überfällige Rechnungen"
      meta={ueberfaellig.length ? `${ueberfaellig.length}` : undefined}
      aktion={<KartenLink href="/rechnungen">Alle Rechnungen</KartenLink>}
      className={voll ? undefined : "xl:col-span-2"}
      inhaltClassName="flex flex-col pb-4"
    >
      {ueberfaellig.length === 0 ? (
        <KarteLeer>Keine Rechnung ist überfällig.</KarteLeer>
      ) : (
        <>
          <ul className="divide-y divide-border">
            {ueberfaellig.slice(0, voll ? 5 : 8).map((r) => {
              const tage = r.faelligkeitsdatum ? tageZwischen(r.faelligkeitsdatum, heute) : 0;
              return (
                <li key={r.id}>
                  <Link href={`/rechnungen/${r.id}`} className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-surface-muted">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-13 font-semibold text-foreground">
                        <Name s={r.fahrschueler} />
                      </span>
                      <span className="block truncate text-xs text-foreground-secondary">
                        {r.nummer}
                        {tage > 0 ? ` · seit ${tage} ${tage === 1 ? "Tag" : "Tagen"}` : ""}
                        {r.mahnstufe > 0 ? ` · ${r.mahnstufe}. Mahnung` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-13 font-semibold tabular-nums text-destructive-text">
                      {formatEuro(Number(r.betrag_brutto))}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-auto px-5 pt-3">
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/rechnungslauf">
                <ListChecks /> Mahnlauf für {ueberfaellig.length} {ueberfaellig.length === 1 ? "Rechnung" : "Rechnungen"} starten
              </Link>
            </Button>
          </div>
        </>
      )}
    </Karte>
  );

  const ratenKarte = (
    <Karte titel="Fällige Raten" meta="bis in 14 Tagen" inhaltClassName="pb-2">
      {raten.length === 0 ? (
        <KarteLeer>In den nächsten 14 Tagen ist keine Rate fällig.</KarteLeer>
      ) : (
        <ul className="divide-y divide-border">
          {raten.slice(0, 6).map((r) => {
            const ueber = r.faellig_am != null && r.faellig_am < heute;
            return (
              <li key={r.id}>
                <Link href={`/schueler/${r.schueler_id}`} className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-surface-muted">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-13 font-semibold text-foreground">
                      <Name s={r.fahrschueler} />
                    </span>
                    <span className="block truncate text-xs text-foreground-secondary">
                      {r.notiz || "Rate"} · {r.faellig_am === heute ? "heute" : r.faellig_am ? formatDatum(r.faellig_am) : "—"}
                    </span>
                  </span>
                  {ueber && <Badge variant="destructive">Überfällig</Badge>}
                  <span className="shrink-0 text-13 font-semibold tabular-nums text-foreground">{formatEuro(Number(r.betrag))}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Karte>
  );

  if (!voll) {
    // ------------------------------------------------------------ Büro: offene Posten
    return (
      <div className="space-y-6">
        <KennzahlReihe>
          <Kennzahl
            label="Offene Rechnungen"
            wert={offene.length}
            sub={`${formatEuro(summe(offene))} ausstehend`}
            icon={FileText}
            akzent={AKZENT.blau}
            href="/rechnungen"
          />
          <Kennzahl
            label="Überfällig"
            wert={ueberfaellig.length}
            sub={ueberfaellig.length ? `${formatEuro(summe(ueberfaellig))} ausstehend` : "Nichts überfällig"}
            ton={ueberfaellig.length ? "kritisch" : undefined}
            icon={AlertTriangle}
            akzent={AKZENT.rot}
            href="/rechnungen"
          />
          <Kennzahl
            label="Gemahnt"
            wert={gemahnt.length}
            sub={`${gemahnt.filter((r) => r.mahnstufe >= 2).length} in der 2. Stufe oder höher`}
            icon={BellRing}
            akzent={AKZENT.orange}
            href="/rechnungslauf"
          />
          <Kennzahl
            label="Fällige Raten"
            wert={raten.length}
            sub={raten.length ? `${formatEuro(ratenSumme)} fällig` : "Keine in den nächsten 14 Tagen"}
            icon={CalendarClock}
            akzent={AKZENT.violett}
          />
        </KennzahlReihe>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {ueberfaelligKarte}
          {ratenKarte}
        </div>

        <Karte titel="Bald fällig" meta="nächste 14 Tage" aktion={<KartenLink href="/rechnungen">Alle Rechnungen</KartenLink>} inhaltClassName="pb-2">
          {baldFaellig.length === 0 ? (
            <KarteLeer>In den nächsten 14 Tagen wird keine Rechnung fällig.</KarteLeer>
          ) : (
            <ul className="divide-y divide-border">
              {baldFaellig.map((r) => (
                <li key={r.id}>
                  <Link href={`/rechnungen/${r.id}`} className="flex items-center gap-4 px-5 py-2.5 transition-colors hover:bg-surface-muted">
                    <span className="w-28 shrink-0 text-13 font-medium tabular-nums text-foreground">{r.nummer}</span>
                    <span className="min-w-0 flex-1 truncate text-13 text-foreground-secondary">
                      <Name s={r.fahrschueler} />
                    </span>
                    <span className="shrink-0 text-13 tabular-nums text-foreground-secondary">
                      fällig {r.faelligkeitsdatum ? formatDatum(r.faelligkeitsdatum) : "—"}
                    </span>
                    <span className="w-24 shrink-0 text-right text-13 font-semibold tabular-nums text-foreground">
                      {formatEuro(Number(r.betrag_brutto))}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Karte>
      </div>
    );
  }

  // ------------------------------------------------------------ Geschäftsführung: alles
  return (
    <div className="space-y-6">
      <KennzahlReihe>
        <Kennzahl
          label="Eingänge diesen Monat"
          wert={formatEuro(dieserMonat.eingang)}
          veraenderung={veraenderung != null ? { wert: veraenderung, label: "ggü. Vormonatszeitraum" } : undefined}
          sub={veraenderung == null ? "Zahlungseingänge" : undefined}
          icon={Banknote}
          akzent={AKZENT.smaragd}
          href="/zahlungen"
        />
        <Kennzahl
          label="Gestellt diesen Monat"
          wert={formatEuro(dieserMonat.gestellt)}
          sub={`seit ${formatDatum(monatsbeginn).slice(0, 6)}`}
          icon={FileText}
          akzent={AKZENT.blau}
          href="/rechnungen"
        />
        <Kennzahl
          label="Offen"
          wert={formatEuro(summe(offene))}
          sub={`${offene.length} ${offene.length === 1 ? "Rechnung" : "Rechnungen"}`}
          icon={Clock3}
          akzent={AKZENT.orange}
          href="/rechnungen"
        />
        <Kennzahl
          label="Überfällig"
          wert={formatEuro(summe(ueberfaellig))}
          sub={`${ueberfaellig.length} ${ueberfaellig.length === 1 ? "Rechnung" : "Rechnungen"} · ${gemahnt.length} gemahnt`}
          ton={ueberfaellig.length ? "kritisch" : undefined}
          icon={AlertTriangle}
          akzent={AKZENT.rot}
          href="/rechnungen"
        />
      </KennzahlReihe>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Verlauf */}
        <Karte
          titel="Einnahmen und Rechnungen"
          meta="letzte 6 Monate"
          aktion={<KartenLink href="/finanzen">Finanzübersicht</KartenLink>}
          className="xl:col-span-2"
          inhaltClassName="px-5 pb-5"
        >
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-13">
            <span className="inline-flex items-center gap-2 text-foreground-secondary">
              <i className="h-2.5 w-2.5 rounded-sm bg-[#C9D6FA]" aria-hidden="true" /> Gestellt
              <span className="font-semibold tabular-nums text-foreground">{formatEuro(summeGestellt)}</span>
            </span>
            <span className="inline-flex items-center gap-2 text-foreground-secondary">
              <i className="h-2.5 w-2.5 rounded-sm" style={{ background: AKZENT.blau }} aria-hidden="true" /> Eingegangen
              <span className="font-semibold tabular-nums text-foreground">{formatEuro(summeEingang)}</span>
            </span>
          </div>
          <div
            className="mt-5 grid grid-cols-[56px_minmax(0,1fr)] gap-3"
            role="img"
            aria-label={`Gestellte und eingegangene Beträge der letzten sechs Monate: gestellt ${formatEuro(summeGestellt)}, eingegangen ${formatEuro(summeEingang)}`}
          >
            <div className="relative h-[240px] text-right text-[11px] tabular-nums text-foreground-tertiary">
              {[1, 0.75, 0.5, 0.25, 0].map((f) => (
                <span key={f} className="absolute right-0 -translate-y-1/2" style={{ top: `${(1 - f) * 100}%` }}>
                  {euroKurz(achsenMax * f)}
                </span>
              ))}
            </div>
            <div className="relative h-[240px]">
              {[0, 0.25, 0.5, 0.75, 1].map((f) => (
                <span key={f} className="absolute inset-x-0 border-t border-dashed border-border" style={{ top: `${f * 100}%` }} aria-hidden="true" />
              ))}
              <div className="absolute inset-0 grid grid-cols-6 items-end gap-3">
                {monate.map((m) => (
                  <div key={m.schluessel} className="flex h-full items-end justify-center gap-1.5">
                    <span
                      className="w-4 rounded-t-[4px] bg-[#C9D6FA]"
                      style={{ height: `${(m.gestellt / achsenMax) * 100}%` }}
                      title={`${m.label}: gestellt ${formatEuro(m.gestellt)}`}
                    />
                    <span
                      className="w-4 rounded-t-[4px]"
                      style={{ height: `${(m.eingang / achsenMax) * 100}%`, background: AKZENT.blau }}
                      title={`${m.label}: eingegangen ${formatEuro(m.eingang)}`}
                    />
                  </div>
                ))}
              </div>
            </div>
            <span />
            <div className="grid grid-cols-6 gap-3 text-center text-xs text-foreground-tertiary">
              {monate.map((m) => (
                <span key={m.schluessel} className={m === dieserMonat ? "font-semibold text-foreground" : undefined}>
                  {m.label}
                </span>
              ))}
            </div>
          </div>
        </Karte>

        {ueberfaelligKarte}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Karte
          titel="Letzte Zahlungseingänge"
          aktion={<KartenLink href="/zahlungen">Alle Zahlungen</KartenLink>}
          className="xl:col-span-2"
          inhaltClassName="pb-2"
        >
          {(letzteRes.data ?? []).length === 0 ? (
            <KarteLeer>Noch keine Zahlungen erfasst.</KarteLeer>
          ) : (
            <ul className="divide-y divide-border">
              {(letzteRes.data ?? []).map((z) => (
                <li key={z.id} className="flex items-center gap-4 px-5 py-2.5">
                  <span className="w-24 shrink-0 text-13 tabular-nums text-foreground-secondary">{formatDatum(z.datum)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-13 font-semibold text-foreground">
                      <Name s={z.fahrschueler} />
                    </span>
                    <span className="block truncate text-xs text-foreground-secondary">
                      {z.rechnung?.nummer ? `${z.rechnung.nummer} · ` : ""}
                      {ZAHLART[z.art] ?? z.art}
                    </span>
                  </span>
                  <span className="shrink-0 text-13 font-semibold tabular-nums text-success-text">+{formatEuro(Number(z.betrag))}</span>
                </li>
              ))}
            </ul>
          )}
        </Karte>

        {ratenKarte}
      </div>
    </div>
  );
}
