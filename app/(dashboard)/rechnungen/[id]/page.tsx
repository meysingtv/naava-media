import Link from "next/link";
import { notFound } from "next/navigation";
import { Bell, Check, Download } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eigenschaft, Eigenschaften } from "@/components/ui/eigenschaften";
import { DetailKopf } from "@/components/shared/detail-kopf";
import { LoeschenDialog } from "@/components/shared/loeschen-dialog";
import { RECHNUNG_STATUS } from "@/lib/constants";
import { formatDatum, formatEuro } from "@/lib/utils";
import type { Fahrschueler, Rechnung, RechnungPosition, Zahlung } from "@/lib/types";
import { mahnungErstellen, rechnungLoeschen, rechnungStatusSetzen } from "../actions";
import { RechnungMehrMenu } from "./rechnung-mehr-menu";

export const metadata = { title: "Rechnung · FahrschulApp" };

const ZAHLART: Record<string, string> = {
  bar: "Bar",
  ueberweisung: "Überweisung",
  lastschrift: "Lastschrift",
  karte: "Karte",
};

export default async function RechnungDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const kontext = await getKontext();

  const { data: rechnungData } = await supabase.from("rechnung").select("*").eq("id", params.id).maybeSingle();
  if (!rechnungData) notFound();
  const rechnung = rechnungData as Rechnung;

  const [positionenRes, schuelerRes, zahlungRes] = await Promise.all([
    supabase.from("rechnung_position").select("*").eq("rechnung_id", rechnung.id),
    rechnung.schueler_id
      ? supabase.from("fahrschueler").select("*").eq("id", rechnung.schueler_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("zahlung").select("*").eq("rechnung_id", rechnung.id).order("datum", { ascending: false }),
  ]);

  const positionen = (positionenRes.data ?? []) as RechnungPosition[];
  const schueler = (schuelerRes.data as Fahrschueler | null) ?? null;
  const zahlungen = (zahlungRes.data ?? []) as Zahlung[];
  const fahrschule = kontext?.fahrschule;

  const heute = new Date().toISOString().slice(0, 10);
  const ueberfaellig =
    rechnung.status !== "bezahlt" &&
    (rechnung.status === "ueberfaellig" || Boolean(rechnung.faelligkeitsdatum && rechnung.faelligkeitsdatum < heute));
  const status = RECHNUNG_STATUS[ueberfaellig ? "ueberfaellig" : rechnung.status];
  const brutto = Number(rechnung.betrag_brutto);
  const netto = Number(rechnung.betrag_netto);
  const gezahlt = zahlungen.reduce((s, z) => s + Number(z.betrag ?? 0), 0);

  return (
    <div>
      <div className="print:hidden">
        <DetailKopf
          zurueck={{ href: "/rechnungen", label: "Rechnungen" }}
          titel={`Rechnung ${rechnung.nummer}`}
          status={<Badge variant={status.variant}>{status.label}</Badge>}
          meta={[
            schueler ? `${schueler.vorname} ${schueler.nachname}` : "Ohne Schüler",
            formatEuro(brutto),
            `vom ${formatDatum(rechnung.rechnungsdatum)}`,
            rechnung.mahnstufe > 0 ? `${rechnung.mahnstufe}. Mahnung` : null,
          ]}
          aktionen={
            <>
              {rechnung.status !== "bezahlt" && (
                <form action={mahnungErstellen}>
                  <input type="hidden" name="id" value={rechnung.id} />
                  <Button type="submit" variant="outline" size="sm">
                    <Bell /> {rechnung.mahnstufe > 0 ? `${rechnung.mahnstufe + 1}. Mahnung` : "Mahnen"}
                  </Button>
                </form>
              )}
              <Button asChild variant="outline" size="sm">
                <a href={`/rechnungen/${rechnung.id}/pdf`} target="_blank" rel="noopener noreferrer">
                  <Download /> PDF
                </a>
              </Button>
              <RechnungMehrMenu id={rechnung.id} status={rechnung.status} mahnstufe={rechnung.mahnstufe} />
              <LoeschenDialog
                action={rechnungLoeschen}
                id={rechnung.id}
                titel="Rechnung löschen?"
                beschreibung={`Rechnung ${rechnung.nummer} wird dauerhaft gelöscht.`}
                buttonLabel=""
              />
              {rechnung.status !== "bezahlt" && (
                <form action={rechnungStatusSetzen}>
                  <input type="hidden" name="id" value={rechnung.id} />
                  <input type="hidden" name="status" value="bezahlt" />
                  <Button type="submit" size="sm">
                    <Check /> Als bezahlt markieren
                  </Button>
                </form>
              )}
            </>
          }
        />
      </div>

      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Rechnungsdokument – so, wie es gedruckt wird */}
        <article className="min-w-0 rounded-lg bg-card px-8 py-10 shadow-panel sm:px-12 print:p-0 print:shadow-none">
          <header className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-base font-semibold text-foreground">{fahrschule?.name ?? "Fahrschule"}</p>
              <p className="mt-1 whitespace-pre-line text-13 text-foreground-secondary">
                {[fahrschule?.strasse, [fahrschule?.plz, fahrschule?.ort].filter(Boolean).join(" ")]
                  .filter(Boolean)
                  .join("\n")}
              </p>
            </div>
            <div className="text-right">
              <p className="text-title font-semibold text-foreground">Rechnung</p>
              <p className="mt-0.5 text-13 tabular-nums text-foreground-secondary">{rechnung.nummer}</p>
            </div>
          </header>

          <div className="mt-10 grid gap-6 text-13 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-medium text-foreground-tertiary">Rechnung an</p>
              {schueler ? (
                <>
                  <p className="font-medium text-foreground">
                    {schueler.vorname} {schueler.nachname}
                  </p>
                  <p className="whitespace-pre-line text-foreground-secondary">
                    {[schueler.strasse, [schueler.plz, schueler.ort].filter(Boolean).join(" ")].filter(Boolean).join("\n")}
                  </p>
                </>
              ) : (
                <p className="text-foreground-secondary">—</p>
              )}
            </div>
            <dl className="grid grid-cols-[auto_auto] justify-start gap-x-6 gap-y-1 sm:justify-end">
              <dt className="text-foreground-secondary">Rechnungsdatum</dt>
              <dd className="text-right tabular-nums text-foreground">{formatDatum(rechnung.rechnungsdatum)}</dd>
              {rechnung.faelligkeitsdatum && (
                <>
                  <dt className="text-foreground-secondary">Fällig bis</dt>
                  <dd className="text-right tabular-nums text-foreground">{formatDatum(rechnung.faelligkeitsdatum)}</dd>
                </>
              )}
              {schueler?.kundennummer != null && (
                <>
                  <dt className="text-foreground-secondary">Kundennummer</dt>
                  <dd className="text-right tabular-nums text-foreground">{schueler.kundennummer}</dd>
                </>
              )}
            </dl>
          </div>

          <table className="mt-10 w-full text-13">
            <thead>
              <tr className="border-b border-border text-left text-xs text-foreground-secondary">
                <th className="pb-2 font-medium">Beschreibung</th>
                <th className="pb-2 text-right font-medium">Menge</th>
                <th className="hidden pb-2 text-right font-medium sm:table-cell">Einzelpreis</th>
                <th className="pb-2 text-right font-medium">Gesamt</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {positionen.map((p) => (
                <tr key={p.id} className="border-b border-border">
                  <td className="py-3 pr-4 text-foreground">{p.beschreibung}</td>
                  <td className="whitespace-nowrap py-3 text-right text-foreground-secondary">
                    {Number(p.menge).toLocaleString("de-DE")} {p.einheit}
                  </td>
                  <td className="hidden whitespace-nowrap py-3 text-right text-foreground-secondary sm:table-cell">
                    {formatEuro(Number(p.einzelpreis))}
                  </td>
                  <td className="whitespace-nowrap py-3 text-right text-foreground">
                    {formatEuro(Number(p.menge) * Number(p.einzelpreis))}
                  </td>
                </tr>
              ))}
              {positionen.length === 0 && (
                <tr className="border-b border-border">
                  <td colSpan={4} className="py-6 text-center text-foreground-secondary">
                    Keine Positionen.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="mt-6 flex justify-end">
            <dl className="w-full max-w-xs space-y-1.5 text-13 tabular-nums">
              <div className="flex justify-between text-foreground-secondary">
                <dt>Netto</dt>
                <dd>{formatEuro(netto)}</dd>
              </div>
              <div className="flex justify-between text-foreground-secondary">
                <dt>MwSt. {rechnung.steuersatz} %</dt>
                <dd>{formatEuro(brutto - netto)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-sm font-semibold text-foreground">
                <dt>Gesamtbetrag</dt>
                <dd>{formatEuro(brutto)}</dd>
              </div>
            </dl>
          </div>

          {rechnung.notiz && <p className="mt-10 border-t border-border pt-4 text-13 text-foreground-secondary">{rechnung.notiz}</p>}

          {(fahrschule?.iban || fahrschule?.steuernummer) && (
            <footer className="mt-10 border-t border-border pt-4 text-xs text-foreground-tertiary">
              {fahrschule?.iban && <p>IBAN {fahrschule.iban}</p>}
              {fahrschule?.steuernummer && <p>Steuernummer {fahrschule.steuernummer}</p>}
            </footer>
          )}
        </article>

        {/* Details und Zahlungen */}
        <aside className="min-w-0 space-y-8 print:hidden">
          <section>
            <h2 className="mb-2 text-13 font-semibold text-foreground">Details</h2>
            <Eigenschaften breite="schmal">
              <Eigenschaft label="Status">
                <Badge variant={status.variant}>{status.label}</Badge>
              </Eigenschaft>
              <Eigenschaft label="Betrag" className="font-medium tabular-nums">
                {formatEuro(brutto)}
              </Eigenschaft>
              <Eigenschaft label="Schüler">
                {schueler && (
                  <Link href={`/schueler/${schueler.id}`} className="hover:underline">
                    {schueler.vorname} {schueler.nachname}
                  </Link>
                )}
              </Eigenschaft>
              <Eigenschaft label="Datum">{formatDatum(rechnung.rechnungsdatum)}</Eigenschaft>
              <Eigenschaft label="Fällig" className={ueberfaellig ? "text-destructive-text" : undefined}>
                {rechnung.faelligkeitsdatum ? formatDatum(rechnung.faelligkeitsdatum) : null}
              </Eigenschaft>
              <Eigenschaft label="Mahnstufe">{rechnung.mahnstufe > 0 ? `${rechnung.mahnstufe}. Mahnung` : null}</Eigenschaft>
              <Eigenschaft label="Gemahnt am">{rechnung.letzte_mahnung ? formatDatum(rechnung.letzte_mahnung) : null}</Eigenschaft>
              <Eigenschaft label="Bezahlt am">{rechnung.bezahlt_am ? formatDatum(rechnung.bezahlt_am) : null}</Eigenschaft>
            </Eigenschaften>
          </section>

          <section className="border-t border-border pt-6">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-13 font-semibold text-foreground">Zahlungen</h2>
              {zahlungen.length > 0 && (
                <span className="text-xs tabular-nums text-foreground-tertiary">{formatEuro(gezahlt)} erhalten</span>
              )}
            </div>
            {zahlungen.length === 0 ? (
              <p className="text-13 text-foreground-secondary">Noch keine Zahlung eingegangen.</p>
            ) : (
              <ul className="space-y-2">
                {zahlungen.map((z) => (
                  <li key={z.id} className="flex items-center justify-between gap-3 text-13">
                    <span className="min-w-0">
                      <span className="block tabular-nums text-foreground">{formatDatum(z.datum)}</span>
                      <span className="block text-xs text-foreground-secondary">{ZAHLART[z.art] ?? z.art}</span>
                    </span>
                    <span className="shrink-0 font-medium tabular-nums text-foreground">{formatEuro(Number(z.betrag))}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
