import Link from "next/link";
import { AlertTriangle, Bell, Download } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import { Button } from "@/components/ui/button";
import { Karte, KarteLeer } from "@/components/ui/karte";
import { KpiCard, KpiRow } from "@/components/ui/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { formatDatum, formatEuro } from "@/lib/utils";
import { heuteBerlin, tageBis } from "@/lib/zeit";
import type { Rechnung } from "@/lib/types";
import { mahnlaufAusfuehren } from "./actions";

export const metadata = { title: "Rechnungslauf · FahrschulApp" };

type RechnungMitSepa = Rechnung & {
  fahrschueler: {
    vorname: string;
    nachname: string;
    iban: string | null;
    sepa_mandat_ref: string | null;
    sepa_mandat_am: string | null;
  } | null;
};

const name = (r: RechnungMitSepa) => (r.fahrschueler ? `${r.fahrschueler.vorname} ${r.fahrschueler.nachname}` : "Ohne Schüler");

export default async function RechnungslaufPage() {
  const supabase = createClient();
  const kontext = await getKontext();
  const fs = kontext?.fahrschule;
  const heute = heuteBerlin();

  const { data } = await supabase
    .from("rechnung")
    .select("*, fahrschueler(vorname, nachname, iban, sepa_mandat_ref, sepa_mandat_am)")
    .neq("status", "bezahlt")
    .order("faelligkeitsdatum", { ascending: true, nullsFirst: false })
    .returns<RechnungMitSepa[]>();

  const offene = data ?? [];
  const summe = (liste: RechnungMitSepa[]) => liste.reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0);
  const sepaFaehig = offene.filter((r) => r.fahrschueler?.iban && r.fahrschueler?.sepa_mandat_ref && r.fahrschueler?.sepa_mandat_am);
  const ueberfaellig = offene.filter((r) => r.faelligkeitsdatum && r.faelligkeitsdatum < heute);
  const gemahnt = offene.filter((r) => r.mahnstufe > 0);
  const sepaBereit = Boolean(fs?.iban && fs?.glaeubiger_id);

  return (
    <div>
      <PageHeader title="Rechnungslauf" />

      <div className="space-y-6">
        <KpiRow cols={3}>
          <KpiCard
            label="Per Lastschrift einziehbar"
            value={formatEuro(summe(sepaFaehig))}
            sub={`${sepaFaehig.length} ${sepaFaehig.length === 1 ? "Rechnung" : "Rechnungen"} mit SEPA-Mandat`}
          />
          <KpiCard
            label="Überfällig"
            value={formatEuro(summe(ueberfaellig))}
            sub={`${ueberfaellig.length} ${ueberfaellig.length === 1 ? "Rechnung" : "Rechnungen"}`}
            tone={ueberfaellig.length ? "destructive" : "neutral"}
          />
          <KpiCard
            label="Bereits gemahnt"
            value={gemahnt.length}
            sub={gemahnt.length ? `${gemahnt.filter((r) => r.mahnstufe >= 2).length} in der 2. Stufe oder höher` : "Keine offenen Mahnungen"}
          />
        </KpiRow>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Karte titel="SEPA-Lastschrift" meta={sepaFaehig.length ? `${sepaFaehig.length} Posten` : undefined} inhaltClassName="flex flex-col">
            {!sepaBereit ? (
              <div className="mx-5 mb-5 flex items-start gap-2.5 rounded-lg bg-warning-soft px-4 py-3 text-13 text-warning-text">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                <span>
                  Für den Einzug fehlen IBAN und Gläubiger-ID der Fahrschule.{" "}
                  <Link href="/einstellungen" className="font-medium underline underline-offset-2">
                    In den Einstellungen hinterlegen
                  </Link>
                </span>
              </div>
            ) : sepaFaehig.length === 0 ? (
              <KarteLeer>Keine Rechnung ist einziehbar. Dafür braucht der Schüler eine IBAN und ein erteiltes SEPA-Mandat.</KarteLeer>
            ) : (
              <>
                <ul className="max-h-[320px] divide-y divide-border overflow-y-auto border-t border-border scrollbar-thin">
                  {sepaFaehig.map((r) => (
                    <li key={r.id}>
                      <Link href={`/rechnungen/${r.id}`} className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-surface-muted">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-13 font-medium text-foreground">{name(r)}</span>
                          <span className="block truncate text-xs text-foreground-secondary">
                            {r.nummer}
                            {r.faelligkeitsdatum ? ` · fällig ${formatDatum(r.faelligkeitsdatum)}` : ""}
                          </span>
                        </span>
                        <span className="shrink-0 text-13 font-semibold tabular-nums text-foreground">{formatEuro(Number(r.betrag_brutto))}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
                  <p className="text-xs text-foreground-secondary">Datei im Format pain.008 für den Import ins Online-Banking.</p>
                  <Button asChild size="sm">
                    <a href="/rechnungslauf/sepa">
                      <Download /> SEPA-Datei erzeugen
                    </a>
                  </Button>
                </div>
              </>
            )}
          </Karte>

          <Karte titel="Mahnlauf" meta={ueberfaellig.length ? `${ueberfaellig.length} überfällig` : undefined} inhaltClassName="flex flex-col">
            {ueberfaellig.length === 0 ? (
              <KarteLeer>Keine Rechnung ist überfällig – ein Mahnlauf ist nicht nötig.</KarteLeer>
            ) : (
              <>
                <ul className="max-h-[320px] divide-y divide-border overflow-y-auto border-t border-border scrollbar-thin">
                  {ueberfaellig.map((r) => {
                    const tage = r.faelligkeitsdatum ? -tageBis(r.faelligkeitsdatum, heute) : 0;
                    return (
                      <li key={r.id}>
                        <Link href={`/rechnungen/${r.id}`} className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-surface-muted">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-13 font-medium text-foreground">{name(r)}</span>
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
                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
                  <p className="text-xs text-foreground-secondary">Erhöht die Mahnstufe aller überfälligen Rechnungen um eins.</p>
                  <form action={mahnlaufAusfuehren}>
                    <Button type="submit" size="sm">
                      <Bell /> Alle {ueberfaellig.length} anmahnen
                    </Button>
                  </form>
                </div>
              </>
            )}
          </Karte>
        </div>

        <p className="text-xs text-foreground-tertiary">
          Das Mahnschreiben selbst druckst du in der jeweiligen Rechnung. Gläubiger-ID und Konto der Fahrschule pflegst du in den{" "}
          <Link href="/einstellungen" className="text-primary-text hover:underline">
            Einstellungen
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
