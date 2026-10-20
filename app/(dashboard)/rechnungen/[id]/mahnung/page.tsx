import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import { DetailKopf } from "@/components/shared/detail-kopf";
import { formatDatum, formatEuro } from "@/lib/utils";
import type { Fahrschueler, Rechnung } from "@/lib/types";
import { PrintButton } from "../print-button";

export const metadata = { title: "Mahnung · FahrschulApp" };

const STUFE: Record<number, { titel: string; gebuehr: number; text: string }> = {
  1: {
    titel: "Zahlungserinnerung",
    gebuehr: 0,
    text: "sicher ist es Ihrer Aufmerksamkeit entgangen – die folgende Rechnung ist noch offen. Bitte gleichen Sie den Betrag in den nächsten Tagen aus.",
  },
  2: {
    titel: "1. Mahnung",
    gebuehr: 5,
    text: "trotz unserer Erinnerung konnten wir bis heute keinen Zahlungseingang feststellen. Wir bitten Sie, den offenen Betrag zzgl. Mahngebühr umgehend zu begleichen.",
  },
  3: {
    titel: "2. Mahnung (letzte Mahnung)",
    gebuehr: 10,
    text: "leider ist die Rechnung weiterhin offen. Wir fordern Sie letztmalig auf, den Betrag zzgl. Mahngebühren innerhalb von 7 Tagen zu zahlen. Andernfalls behalten wir uns weitere Schritte vor.",
  },
};

export default async function MahnungPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const kontext = await getKontext();

  const { data } = await supabase
    .from("rechnung")
    .select("*, fahrschueler(vorname, nachname, strasse, plz, ort)")
    .eq("id", params.id)
    .maybeSingle();

  if (!data) notFound();

  const r = data as Rechnung & {
    fahrschueler: Pick<Fahrschueler, "vorname" | "nachname" | "strasse" | "plz" | "ort"> | null;
  };
  const fs = kontext?.fahrschule;
  const stufe = Math.max(1, Math.min(r.mahnstufe || 1, 3));
  const info = STUFE[stufe];
  const brutto = Number(r.betrag_brutto ?? 0);
  const gesamt = brutto + info.gebuehr;
  const heute = new Date().toISOString().slice(0, 10);
  const tageOffen = r.faelligkeitsdatum
    ? Math.max(0, Math.round((Date.parse(heute) - Date.parse(r.faelligkeitsdatum)) / 86400000))
    : null;

  return (
    <div>
      <div className="print:hidden">
        <DetailKopf
          zurueck={{ href: `/rechnungen/${r.id}`, label: `Rechnung ${r.nummer}` }}
          titel={info.titel}
          kurztitel={`Mahnung ${r.nummer}`}
          meta={[
            r.fahrschueler ? `${r.fahrschueler.vorname} ${r.fahrschueler.nachname}` : "Ohne Schüler",
            `Rechnung ${r.nummer}`,
            `zu zahlen ${formatEuro(gesamt)}`,
          ]}
          aktionen={<PrintButton />}
        />
      </div>

      <article className="mx-auto max-w-3xl rounded-xl bg-card px-8 py-10 text-foreground shadow-panel sm:px-12 print:max-w-none print:p-0 print:shadow-none">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold">{fs?.name ?? "Fahrschule"}</h1>
            <p className="mt-1 whitespace-pre-line text-sm text-foreground-secondary">
              {[fs?.strasse, [fs?.plz, fs?.ort].filter(Boolean).join(" ")].filter(Boolean).join("\n")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-foreground">{info.titel}</p>
            <p className="text-xs text-foreground-secondary">vom {formatDatum(heute)}</p>
          </div>
        </div>

        {r.fahrschueler && (
          <div className="mt-8 text-sm">
            <p className="font-medium">
              {r.fahrschueler.vorname} {r.fahrschueler.nachname}
            </p>
            <p className="whitespace-pre-line text-foreground-secondary">
              {[r.fahrschueler.strasse, [r.fahrschueler.plz, r.fahrschueler.ort].filter(Boolean).join(" ")]
                .filter(Boolean)
                .join("\n")}
            </p>
          </div>
        )}

        <p className="mt-8 text-sm">
          Sehr geehrte/r {r.fahrschueler ? `${r.fahrschueler.vorname} ${r.fahrschueler.nachname}` : "Kunde/Kundin"},
        </p>
        <p className="mt-3 text-sm leading-relaxed">{info.text}</p>

        <table className="mt-8 w-full text-sm">
          <thead>
            <tr className="border-b text-left text-foreground-secondary">
              <th className="py-2 font-medium">Rechnung</th>
              <th className="py-2 font-medium">Datum</th>
              <th className="py-2 font-medium">Fällig</th>
              <th className="py-2 text-right font-medium">Betrag</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2.5">{r.nummer}</td>
              <td className="py-2.5">{formatDatum(r.rechnungsdatum)}</td>
              <td className="py-2.5">
                {r.faelligkeitsdatum ? formatDatum(r.faelligkeitsdatum) : "—"}
                {tageOffen != null && tageOffen > 0 && (
                  <span className="ml-1 text-destructive-text">({tageOffen} T. überfällig)</span>
                )}
              </td>
              <td className="py-2.5 text-right">{formatEuro(brutto)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <div className="w-full max-w-xs space-y-1 text-sm">
            <div className="flex justify-between text-foreground-secondary">
              <span>Offener Rechnungsbetrag</span>
              <span>{formatEuro(brutto)}</span>
            </div>
            {info.gebuehr > 0 && (
              <div className="flex justify-between text-foreground-secondary">
                <span>Mahngebühr</span>
                <span>{formatEuro(info.gebuehr)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-1.5 text-base font-semibold">
              <span>Zu zahlen</span>
              <span>{formatEuro(gesamt)}</span>
            </div>
          </div>
        </div>

        {(fs?.iban || fs?.kontoinhaber) && (
          <p className="mt-8 border-t pt-4 text-xs text-foreground-secondary">
            Bitte überweisen Sie auf: {fs?.kontoinhaber ? `${fs.kontoinhaber}, ` : ""}
            {fs?.iban ? `IBAN ${fs.iban}` : ""}
            {fs?.bic ? `, BIC ${fs.bic}` : ""} · Verwendungszweck: {r.nummer}
          </p>
        )}
      </article>
    </div>
  );
}
