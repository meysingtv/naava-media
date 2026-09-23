import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/app/(dashboard)/rechnungen/[id]/print-button";
import { FAHRSTUNDE_TYPEN, pflichtFahrtenFuer } from "@/lib/constants";
import { formatDatum, formatUhrzeit } from "@/lib/utils";
import type { Fahrschueler, Fahrstunde } from "@/lib/types";
import { UnterschriftDialog } from "./unterschrift-dialog";

export const metadata = { title: "Ausbildungsnachweis · FahrschulApp" };

type FahrstundeDetail = Fahrstunde & {
  fahrlehrer: { vorname: string; nachname: string } | null;
  fahrzeug: { kennzeichen: string } | null;
};

export default async function AusbildungsnachweisPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const kontext = await getKontext();

  const { data: schuelerData } = await supabase
    .from("fahrschueler")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!schuelerData) notFound();
  const s = schuelerData as Fahrschueler;

  const { data: stundenData } = await supabase
    .from("fahrstunde")
    .select("*, fahrlehrer(vorname, nachname), fahrzeug(kennzeichen)")
    .eq("schueler_id", s.id)
    .eq("status", "abgeschlossen")
    .order("datum", { ascending: true })
    .order("uhrzeit", { ascending: true })
    .returns<FahrstundeDetail[]>();

  const stunden = stundenData ?? [];
  const fs = kontext?.fahrschule;
  const klasse = s.fuehrerscheinklassen?.[0] ?? "B";
  const pflicht = pflichtFahrtenFuer(klasse);

  const zaehle = (typ: Fahrstunde["typ"]) => stunden.filter((f) => f.typ === typ).length;
  const sonder = [
    { label: "Überlandfahrten", ist: zaehle("ueberland"), soll: pflicht.ueberland },
    { label: "Autobahnfahrten", ist: zaehle("autobahn"), soll: pflicht.autobahn },
    { label: "Nachtfahrten", ist: zaehle("nacht"), soll: pflicht.nacht },
  ];
  const unterschrieben = stunden.filter((f) => f.unterschrift).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/schueler/${s.id}`}>
            <ArrowLeft className="h-4 w-4" /> Zurück
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {unterschrieben}/{stunden.length} unterschrieben
          </span>
          <PrintButton />
        </div>
      </div>

      <Card className="mx-auto max-w-4xl p-6 sm:p-10 print:border-0 print:shadow-none">
        {/* Kopf */}
        <div className="flex items-start justify-between border-b pb-4">
          <div>
            <h1 className="text-lg font-semibold">{fs?.name ?? "Fahrschule"}</h1>
            <p className="mt-0.5 whitespace-pre-line text-sm text-muted-foreground">
              {[fs?.strasse, [fs?.plz, fs?.ort].filter(Boolean).join(" ")].filter(Boolean).join("\n")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-base font-semibold">Ausbildungsnachweis</p>
            <p className="text-xs text-muted-foreground">Klasse {klasse}</p>
          </div>
        </div>

        {/* Schüler */}
        <div className="mt-4 flex flex-wrap justify-between gap-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Fahrschüler</p>
            <p className="font-medium">
              {s.vorname} {s.nachname}
            </p>
            {s.geburtsdatum && (
              <p className="text-muted-foreground">geb. {formatDatum(s.geburtsdatum)}</p>
            )}
          </div>
          <div className="text-right">
            {s.kundennummer != null && (
              <p>
                <span className="text-muted-foreground">Kundennr.: </span>
                <span className="font-medium">{s.kundennummer}</span>
              </p>
            )}
            <p>
              <span className="text-muted-foreground">Ausbildungsbeginn: </span>
              {formatDatum(s.anmeldedatum)}
            </p>
          </div>
        </div>

        {/* Sonderfahrten-Übersicht */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {sonder.map((row) => {
            const ok = row.ist >= row.soll;
            return (
              <div key={row.label} className="rounded-lg border p-3 text-center">
                <p className="text-xs text-muted-foreground">{row.label}</p>
                <p className={`text-lg font-semibold tabular-nums ${ok ? "text-success" : "text-foreground"}`}>
                  {row.ist} / {row.soll}
                </p>
              </div>
            );
          })}
        </div>

        {/* Fahrstunden-Tabelle */}
        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-2 font-medium">Nr.</th>
              <th className="py-2 pr-2 font-medium">Datum</th>
              <th className="py-2 pr-2 font-medium">Art</th>
              <th className="py-2 pr-2 font-medium">Min.</th>
              <th className="py-2 pr-2 font-medium">Fahrlehrer</th>
              <th className="py-2 pr-2 font-medium">Kfz</th>
              <th className="py-2 text-right font-medium">Unterschrift</th>
            </tr>
          </thead>
          <tbody>
            {stunden.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted-foreground">
                  Noch keine abgeschlossenen Fahrstunden.
                </td>
              </tr>
            ) : (
              stunden.map((f, i) => (
                <tr key={f.id} className="border-b align-middle">
                  <td className="py-2 pr-2 tabular-nums text-muted-foreground">{i + 1}</td>
                  <td className="py-2 pr-2 tabular-nums">
                    {formatDatum(f.datum)}
                    <span className="ml-1 text-xs text-muted-foreground">{formatUhrzeit(f.uhrzeit)}</span>
                  </td>
                  <td className="py-2 pr-2">{FAHRSTUNDE_TYPEN[f.typ]?.kurz ?? f.typ}</td>
                  <td className="py-2 pr-2 tabular-nums">{f.dauer_minuten}</td>
                  <td className="py-2 pr-2">
                    {f.fahrlehrer ? `${f.fahrlehrer.vorname} ${f.fahrlehrer.nachname}` : "—"}
                  </td>
                  <td className="py-2 pr-2 text-muted-foreground">{f.fahrzeug?.kennzeichen ?? "—"}</td>
                  <td className="py-2 text-right">
                    <div className="inline-flex items-center justify-end gap-2">
                      {f.unterschrift && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={f.unterschrift} alt="Unterschrift" className="hidden h-8 print:block" />
                      )}
                      <span className="print:hidden">
                        <UnterschriftDialog
                          fahrstundeId={f.id}
                          schuelerId={s.id}
                          vorhanden={Boolean(f.unterschrift)}
                          label={`${FAHRSTUNDE_TYPEN[f.typ]?.label ?? f.typ} am ${formatDatum(f.datum)}`}
                        />
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <p className="mt-8 text-xs text-muted-foreground">
          Dieser Nachweis dokumentiert die absolvierten Ausbildungsfahrten gemäß Fahrschüler-Ausbildungsordnung.
          Digitale Unterschriften werden je Fahrstunde erfasst.
        </p>
      </Card>
    </div>
  );
}
