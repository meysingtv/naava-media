import Link from "next/link";
import { AlertTriangle, Banknote, Bell, Download, Settings } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { formatDatum, formatEuro } from "@/lib/utils";
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

export default async function RechnungslaufPage() {
  const supabase = createClient();
  const kontext = await getKontext();
  const fs = kontext?.fahrschule;
  const heute = new Date().toISOString().slice(0, 10);

  const { data } = await supabase
    .from("rechnung")
    .select("*, fahrschueler(vorname, nachname, iban, sepa_mandat_ref, sepa_mandat_am)")
    .neq("status", "bezahlt")
    .order("faelligkeitsdatum", { ascending: true, nullsFirst: false })
    .returns<RechnungMitSepa[]>();

  const offene = data ?? [];
  const sepaFaehig = offene.filter(
    (r) => r.fahrschueler?.iban && r.fahrschueler?.sepa_mandat_ref && r.fahrschueler?.sepa_mandat_am,
  );
  const sepaSumme = sepaFaehig.reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0);
  const ueberfaellig = offene.filter((r) => r.faelligkeitsdatum && r.faelligkeitsdatum < heute);
  const ueberfaelligSumme = ueberfaellig.reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0);

  const sepaBereit = Boolean(fs?.iban && fs?.glaeubiger_id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rechnungslauf"
        description="SEPA-Lastschriften einziehen und überfällige Rechnungen sammeln anmahnen."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* SEPA-Lastschrift */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 p-5 pb-3">
            <CardTitle className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} /> SEPA-Lastschrift
            </CardTitle>
            <Badge variant="secondary">{sepaFaehig.length} Posten</Badge>
          </CardHeader>
          <CardContent className="space-y-4 p-5 pt-0">
            <div className="rounded-lg border bg-surface px-4 py-3">
              <p className="text-2xs uppercase tracking-wide text-muted-foreground">Einzugsbetrag</p>
              <p className="text-xl font-semibold text-foreground tabular-nums">{formatEuro(sepaSumme)}</p>
            </div>

            {!sepaBereit ? (
              <div className="flex items-start gap-2.5 rounded-md border border-warning/25 bg-warning-soft px-3 py-2.5 text-sm text-warning">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Für den Einzug fehlen IBAN und Gläubiger-ID der Fahrschule.{" "}
                  <Link href="/einstellungen" className="font-medium underline underline-offset-2">
                    In Einstellungen hinterlegen
                  </Link>
                  .
                </span>
              </div>
            ) : sepaFaehig.length === 0 ? (
              <p className="rounded-md border border-dashed border-border-strong px-3 py-6 text-center text-sm text-muted-foreground">
                Keine einzugsfähigen Rechnungen. Voraussetzung: Schüler mit IBAN + SEPA-Mandat.
              </p>
            ) : (
              <>
                <div className="max-h-56 divide-y overflow-y-auto rounded-md border scrollbar-thin">
                  {sepaFaehig.slice(0, 50).map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                      <span className="truncate">
                        {r.fahrschueler?.vorname} {r.fahrschueler?.nachname}
                        <span className="text-muted-foreground"> · {r.nummer}</span>
                      </span>
                      <span className="shrink-0 font-medium tabular-nums">{formatEuro(Number(r.betrag_brutto))}</span>
                    </div>
                  ))}
                </div>
                <Button asChild className="w-full">
                  <a href="/rechnungslauf/sepa">
                    <Download /> SEPA-XML erzeugen ({sepaFaehig.length})
                  </a>
                </Button>
                <p className="text-xs text-muted-foreground">
                  Lädt eine pain.008-Datei zum Import ins Online-Banking herunter.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Mahnlauf */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 p-5 pb-3">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} /> Mahnlauf
            </CardTitle>
            <Badge variant={ueberfaellig.length > 0 ? "warning" : "secondary"}>
              {ueberfaellig.length} überfällig
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4 p-5 pt-0">
            <div className="rounded-lg border bg-surface px-4 py-3">
              <p className="text-2xs uppercase tracking-wide text-muted-foreground">Überfällige Summe</p>
              <p className="text-xl font-semibold text-foreground tabular-nums">{formatEuro(ueberfaelligSumme)}</p>
            </div>

            {ueberfaellig.length === 0 ? (
              <p className="rounded-md border border-dashed border-border-strong px-3 py-6 text-center text-sm text-muted-foreground">
                Keine überfälligen Rechnungen. 🎉
              </p>
            ) : (
              <>
                <div className="max-h-56 divide-y overflow-y-auto rounded-md border scrollbar-thin">
                  {ueberfaellig.slice(0, 50).map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                      <span className="min-w-0 truncate">
                        {r.fahrschueler ? `${r.fahrschueler.vorname} ${r.fahrschueler.nachname}` : "Ohne Schüler"}
                        <span className="text-muted-foreground"> · fällig {formatDatum(r.faelligkeitsdatum)}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        {r.mahnstufe > 0 && <Badge variant="outline">St. {r.mahnstufe}</Badge>}
                        <span className="font-medium tabular-nums">{formatEuro(Number(r.betrag_brutto))}</span>
                      </span>
                    </div>
                  ))}
                </div>
                <form action={mahnlaufAusfuehren}>
                  <Button type="submit" className="w-full">
                    <Bell /> Alle anmahnen (Stufe +1)
                  </Button>
                </form>
                <p className="text-xs text-muted-foreground">
                  Erhöht die Mahnstufe aller überfälligen Rechnungen. Einzelne Mahnschreiben druckst du in
                  der jeweiligen Rechnung.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Settings className="h-3.5 w-3.5" />
        SEPA-Gläubigerdaten &amp; Konto pflegst du unter{" "}
        <Link href="/einstellungen" className="font-medium text-primary underline-offset-2 hover:underline">
          Einstellungen
        </Link>
        .
      </div>
    </div>
  );
}
