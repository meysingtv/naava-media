import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import { Badge } from "@/components/ui/badge";
import { DetailKopf } from "@/components/shared/detail-kopf";
import { PrintButton } from "@/app/(dashboard)/rechnungen/[id]/print-button";
import { formatDatum } from "@/lib/utils";
import type { Fahrschueler } from "@/lib/types";
import { VertragSignatur } from "./vertrag-signatur";

export const metadata = { title: "Ausbildungsvertrag · FahrschulApp" };

export default async function VertragPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const kontext = await getKontext();

  const { data } = await supabase.from("fahrschueler").select("*").eq("id", params.id).maybeSingle();
  if (!data) notFound();
  const s = data as Fahrschueler;
  const fs = kontext?.fahrschule;
  const klassen = s.fuehrerscheinklassen?.length ? s.fuehrerscheinklassen.join(", ") : "—";
  const heute = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div className="print:hidden">
        <DetailKopf
          zurueck={{ href: `/schueler/${s.id}`, label: `${s.vorname} ${s.nachname}` }}
          titel="Ausbildungsvertrag"
          kurztitel={`Vertrag ${s.nachname}`}
          status={s.vertrag_unterschrift ? <Badge>Unterschrieben</Badge> : <Badge variant="warning">Nicht unterschrieben</Badge>}
          meta={[`${s.vorname} ${s.nachname}`, `Klasse ${klassen}`, s.vertrag_am ? `unterschrieben am ${formatDatum(s.vertrag_am)}` : null]}
          aktionen={
            <>
              <PrintButton />
              {!s.vertrag_unterschrift && <VertragSignatur schuelerId={s.id} />}
            </>
          }
        />
      </div>

      <article className="mx-auto max-w-3xl rounded-xl bg-card px-8 py-10 text-foreground shadow-panel sm:px-12 print:max-w-none print:p-0 print:shadow-none">
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div>
            <h1 className="text-lg font-semibold">{fs?.name ?? "Fahrschule"}</h1>
            <p className="mt-0.5 whitespace-pre-line text-sm text-foreground-secondary">
              {[fs?.strasse, [fs?.plz, fs?.ort].filter(Boolean).join(" ")].filter(Boolean).join("\n")}
            </p>
          </div>
          <p className="text-base font-semibold">Ausbildungsvertrag</p>
        </div>

        <div className="mt-6 space-y-4 text-sm leading-relaxed">
          <p>
            Zwischen der Fahrschule <strong>{fs?.name ?? "—"}</strong> (nachfolgend {"„Fahrschule“"}) und
          </p>
          <div className="rounded-lg bg-surface-muted/70 p-4">
            <p className="font-medium text-foreground">
              {s.vorname} {s.nachname}
            </p>
            <p className="text-foreground-secondary">
              {[s.strasse, [s.plz, s.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "—"}
            </p>
            {s.geburtsdatum && (
              <p className="text-foreground-secondary">geboren am {formatDatum(s.geburtsdatum)}</p>
            )}
          </div>
          <p>(nachfolgend {"„Fahrschüler/in“"}) wird folgender Ausbildungsvertrag geschlossen:</p>

          <div className="space-y-2">
            <p>
              <strong>§ 1 Ausbildungsumfang.</strong> Die Fahrschule bildet die/den Fahrschüler/in in der/den
              Führerscheinklasse(n) <strong>{klassen}</strong> gemäß den gesetzlichen Vorschriften
              (Fahrschüler-Ausbildungsordnung) aus.
            </p>
            <p>
              <strong>§ 2 Leistungen &amp; Preise.</strong> Es gilt die jeweils aktuelle Preisliste der Fahrschule.
              Grundbetrag, Fahrstunden, Sonderfahrten, Vorstellungsentgelte und Prüfgebühren werden gemäß Preisliste
              abgerechnet.
            </p>
            <p>
              <strong>§ 3 Zahlung.</strong> Rechnungen sind innerhalb der angegebenen Frist zu zahlen. Bei
              SEPA-Lastschrift erfolgt der Einzug nach erteiltem Mandat.
            </p>
            <p>
              <strong>§ 4 Rücktritt.</strong> Ein Rücktritt ist jederzeit möglich; bereits erbrachte Leistungen sind
              zu vergüten. Gesetzliche Widerrufsrechte bleiben unberührt.
            </p>
            <p>
              <strong>§ 5 Datenschutz.</strong> Die personenbezogenen Daten werden ausschließlich zur Durchführung der
              Ausbildung gemäß DSGVO verarbeitet.
            </p>
          </div>
        </div>

        {/* Unterschriften */}
        <div className="mt-10 grid grid-cols-2 gap-8">
          <div>
            <div className="h-16 border-b border-foreground/40" />
            <p className="mt-1 text-xs text-foreground-secondary">
              Ort, Datum · Fahrschule ({fs?.ort ?? "—"}, {formatDatum(heute)})
            </p>
          </div>
          <div>
            <div className="flex h-16 items-end border-b border-foreground/40">
              {s.vertrag_unterschrift && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.vertrag_unterschrift} alt="Unterschrift" className="max-h-14" />
              )}
            </div>
            <p className="mt-1 text-xs text-foreground-secondary">
              Unterschrift Fahrschüler/in
              {s.vertrag_am ? ` · unterschrieben am ${formatDatum(s.vertrag_am)}` : ""}
            </p>
          </div>
        </div>

        {s.geburtsdatum && istMinderjaehrig(s.geburtsdatum) && (
          <div className="mt-8">
            <div className="h-16 border-b border-foreground/40" />
            <p className="mt-1 text-xs text-foreground-secondary">
              Unterschrift gesetzliche/r Vertreter/in (bei Minderjährigen erforderlich)
            </p>
          </div>
        )}
      </article>
    </div>
  );
}

function istMinderjaehrig(geb: string): boolean {
  const d = new Date(geb);
  if (Number.isNaN(d.getTime())) return false;
  const heute = new Date();
  let a = heute.getFullYear() - d.getFullYear();
  const m = heute.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && heute.getDate() < d.getDate())) a -= 1;
  return a < 18;
}
