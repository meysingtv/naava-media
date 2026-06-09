import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoeschenDialog } from "@/components/shared/loeschen-dialog";
import { RECHNUNG_STATUS } from "@/lib/constants";
import { formatDatum, formatEuro } from "@/lib/utils";
import type { Fahrschueler, Rechnung, RechnungPosition } from "@/lib/types";
import { PrintButton } from "./print-button";
import { rechnungLoeschen, rechnungStatusSetzen } from "../actions";

export const metadata = { title: "Rechnung · FahrschulApp" };

export default async function RechnungDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const kontext = await getKontext();

  const { data: rechnungData } = await supabase
    .from("rechnung")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!rechnungData) {
    notFound();
  }
  const rechnung = rechnungData as Rechnung;

  const [positionenRes, schuelerRes] = await Promise.all([
    supabase.from("rechnung_position").select("*").eq("rechnung_id", rechnung.id),
    rechnung.schueler_id
      ? supabase.from("fahrschueler").select("*").eq("id", rechnung.schueler_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const positionen = (positionenRes.data ?? []) as RechnungPosition[];
  const schueler = (schuelerRes.data as Fahrschueler | null) ?? null;
  const fahrschule = kontext?.fahrschule;
  const status = RECHNUNG_STATUS[rechnung.status];

  return (
    <div className="space-y-5">
      {/* Aktionsleiste – wird beim Drucken ausgeblendet */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link href="/rechnungen">
            <ArrowLeft className="h-4 w-4" /> Zurück
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {rechnung.status !== "bezahlt" && (
            <form action={rechnungStatusSetzen}>
              <input type="hidden" name="id" value={rechnung.id} />
              <input type="hidden" name="status" value="bezahlt" />
              <Button type="submit" variant="success" size="sm">
                <Check className="h-4 w-4" /> Als bezahlt markieren
              </Button>
            </form>
          )}
          {rechnung.status !== "offen" && (
            <form action={rechnungStatusSetzen}>
              <input type="hidden" name="id" value={rechnung.id} />
              <input type="hidden" name="status" value="offen" />
              <Button type="submit" variant="outline" size="sm">
                Als offen markieren
              </Button>
            </form>
          )}
          <PrintButton />
          <LoeschenDialog
            action={rechnungLoeschen}
            id={rechnung.id}
            titel="Rechnung löschen?"
            beschreibung={`Rechnung ${rechnung.nummer} wird dauerhaft gelöscht.`}
            buttonLabel=""
          />
        </div>
      </div>

      {/* Rechnungsdokument */}
      <Card className="mx-auto max-w-3xl p-8 sm:p-12 print:border-0 print:shadow-none">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{fahrschule?.name ?? "Fahrschule"}</h1>
            <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
              {[fahrschule?.strasse, [fahrschule?.plz, fahrschule?.ort].filter(Boolean).join(" ")]
                .filter(Boolean)
                .join("\n")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">Rechnung</p>
            <Badge variant="outline" className={`${status.badge} mt-1`}>
              {status.label}
            </Badge>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-between gap-6 text-sm">
          <div>
            {schueler && (
              <>
                <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                  Rechnung an
                </p>
                <p className="font-medium">
                  {schueler.vorname} {schueler.nachname}
                </p>
                <p className="whitespace-pre-line text-muted-foreground">
                  {[schueler.strasse, [schueler.plz, schueler.ort].filter(Boolean).join(" ")]
                    .filter(Boolean)
                    .join("\n")}
                </p>
              </>
            )}
          </div>
          <div className="space-y-1 text-right">
            <p>
              <span className="text-muted-foreground">Rechnungsnr.: </span>
              <span className="font-medium">{rechnung.nummer}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Datum: </span>
              {formatDatum(rechnung.rechnungsdatum)}
            </p>
            {rechnung.faelligkeitsdatum && (
              <p>
                <span className="text-muted-foreground">Fällig bis: </span>
                {formatDatum(rechnung.faelligkeitsdatum)}
              </p>
            )}
          </div>
        </div>

        <table className="mt-8 w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 font-medium">Beschreibung</th>
              <th className="py-2 text-right font-medium">Menge</th>
              <th className="py-2 text-right font-medium">Einzelpreis</th>
              <th className="py-2 text-right font-medium">Gesamt</th>
            </tr>
          </thead>
          <tbody>
            {positionen.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="py-2.5">{p.beschreibung}</td>
                <td className="py-2.5 text-right">
                  {p.menge} {p.einheit}
                </td>
                <td className="py-2.5 text-right">{formatEuro(Number(p.einzelpreis))}</td>
                <td className="py-2.5 text-right">
                  {formatEuro(Number(p.menge) * Number(p.einzelpreis))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <div className="w-full max-w-xs space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Netto</span>
              <span>{formatEuro(Number(rechnung.betrag_netto))}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>MwSt. ({rechnung.steuersatz}%)</span>
              <span>
                {formatEuro(Number(rechnung.betrag_brutto) - Number(rechnung.betrag_netto))}
              </span>
            </div>
            <div className="flex justify-between border-t pt-1.5 text-base font-bold">
              <span>Gesamtbetrag</span>
              <span>{formatEuro(Number(rechnung.betrag_brutto))}</span>
            </div>
          </div>
        </div>

        {rechnung.notiz && (
          <p className="mt-8 border-t pt-4 text-sm text-muted-foreground">{rechnung.notiz}</p>
        )}

        {(fahrschule?.iban || fahrschule?.steuernummer) && (
          <div className="mt-8 border-t pt-4 text-xs text-muted-foreground">
            {fahrschule?.iban && <p>IBAN: {fahrschule.iban}</p>}
            {fahrschule?.steuernummer && <p>Steuernummer: {fahrschule.steuernummer}</p>}
          </div>
        )}
      </Card>
    </div>
  );
}
