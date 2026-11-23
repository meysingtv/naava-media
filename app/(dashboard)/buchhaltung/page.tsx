import Link from "next/link";
import { Download, Trash2 } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Karte, KarteLeer } from "@/components/ui/karte";
import { KpiCard, KpiRow } from "@/components/ui/kpi-card";
import { LinkSegmente } from "@/components/shared/link-segmente";
import { PageHeader } from "@/components/shared/page-header";
import { Saeulen } from "@/components/shared/saeulen";
import { cn, formatDatum, formatEuro } from "@/lib/utils";
import { heuteBerlin } from "@/lib/zeit";
import type { KassenbuchEintrag, Rechnung } from "@/lib/types";
import { KassenbuchNeu } from "./kassenbuch-neu";
import { kassenEintragLoeschen } from "./actions";

export const metadata = { title: "Buchhaltung · FahrschulApp" };

type RechnungRow = Pick<Rechnung, "rechnungsdatum" | "betrag_netto" | "betrag_brutto" | "status">;

export default async function BuchhaltungPage({ searchParams }: { searchParams: { jahr?: string } }) {
  const supabase = createClient();
  const heute = heuteBerlin();
  const aktuellesJahr = Number(heute.slice(0, 4));
  const jahre = [aktuellesJahr, aktuellesJahr - 1, aktuellesJahr - 2];
  const jahr = jahre.includes(Number(searchParams.jahr)) ? Number(searchParams.jahr) : aktuellesJahr;

  const [rechnungRes, kassenRes] = await Promise.all([
    supabase
      .from("rechnung")
      .select("rechnungsdatum, betrag_netto, betrag_brutto, status")
      .gte("rechnungsdatum", `${jahr}-01-01`)
      .lte("rechnungsdatum", `${jahr}-12-31`)
      .returns<RechnungRow[]>(),
    supabase
      .from("kassenbuch_eintrag")
      .select("*")
      .gte("datum", `${jahr}-01-01`)
      .lte("datum", `${jahr}-12-31`)
      .order("datum", { ascending: false })
      .order("created_at", { ascending: false })
      .returns<KassenbuchEintrag[]>(),
  ]);

  const rechnungen = rechnungRes.data ?? [];
  const netto = (liste: RechnungRow[]) => liste.reduce((s, r) => s + Number(r.betrag_netto ?? 0), 0);
  const brutto = (liste: RechnungRow[]) => liste.reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0);
  const offen = rechnungen.filter((r) => r.status !== "bezahlt");

  // Umsatz je Monat und Umsatzsteuer je Quartal (für die Voranmeldung)
  const monate = Array.from({ length: 12 }, (_, i) => {
    const schluessel = `${jahr}-${String(i + 1).padStart(2, "0")}`;
    return {
      schluessel,
      label: new Date(Date.UTC(jahr, i, 1)).toLocaleDateString("de-DE", { month: "short", timeZone: "UTC" }).replace(".", ""),
      wert: brutto(rechnungen.filter((r) => (r.rechnungsdatum ?? "").startsWith(schluessel))),
    };
  });
  const quartale = [0, 1, 2, 3].map((q) => {
    const liste = rechnungen.filter((r) => {
      const m = Number((r.rechnungsdatum ?? "").slice(5, 7));
      return m >= q * 3 + 1 && m <= q * 3 + 3;
    });
    return { label: `Q${q + 1}`, netto: netto(liste), brutto: brutto(liste), anzahl: liste.length };
  });
  const aktuelleMonat = jahr === aktuellesJahr ? heute.slice(0, 7) : `${jahr}-12`;

  // Kassenbuch
  const kasse = kassenRes.data ?? [];
  const einnahmen = kasse.filter((k) => k.typ === "einnahme").reduce((s, k) => s + Number(k.betrag), 0);
  const ausgaben = kasse.filter((k) => k.typ === "ausgabe").reduce((s, k) => s + Number(k.betrag), 0);
  const saldo = einnahmen - ausgaben;

  return (
    <div>
      <PageHeader title="Buchhaltung">
        <LinkSegmente
          label="Jahr"
          aktiv={String(jahr)}
          optionen={jahre.map((j) => ({ key: String(j), label: String(j), href: j === aktuellesJahr ? "/buchhaltung" : `/buchhaltung?jahr=${j}` }))}
        />
        <Button asChild size="sm">
          <Link href={`/buchhaltung/datev?jahr=${jahr}`}>
            <Download /> DATEV-Export {jahr}
          </Link>
        </Button>
      </PageHeader>

      <div className="space-y-6">
        <KpiRow>
          <KpiCard label={`Umsatz ${jahr} brutto`} value={formatEuro(brutto(rechnungen))} sub={`${rechnungen.length} Rechnungen`} />
          <KpiCard label="Umsatz netto" value={formatEuro(netto(rechnungen))} sub="ohne Umsatzsteuer" />
          <KpiCard label="Umsatzsteuer" value={formatEuro(brutto(rechnungen) - netto(rechnungen))} sub="aus gestellten Rechnungen" />
          <KpiCard
            label="Offene Forderungen"
            value={formatEuro(brutto(offen))}
            sub={`${offen.length} ${offen.length === 1 ? "Rechnung" : "Rechnungen"}`}
            tone={offen.length ? "warning" : "neutral"}
            href="/rechnungen"
          />
        </KpiRow>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Karte titel="Umsatz je Monat" meta={`${jahr} · brutto`} className="xl:col-span-2" inhaltClassName="px-5 pb-5">
            <Saeulen werte={monate} einheit="euro" hervorheben={aktuelleMonat} label={`Umsatz je Monat ${jahr}`} />
          </Karte>

          <Karte titel="Umsatzsteuer je Quartal" meta="für die Voranmeldung" inhaltClassName="pb-2">
            <table className="w-full text-13 tabular-nums">
              <thead>
                <tr className="border-y border-border bg-surface-muted/60 text-left text-xs text-foreground-secondary">
                  <th className="px-5 py-2 font-medium">Quartal</th>
                  <th className="px-2 py-2 text-right font-medium">Netto</th>
                  <th className="px-5 py-2 text-right font-medium">USt.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {quartale.map((q) => (
                  <tr key={q.label}>
                    <td className="px-5 py-2.5 font-medium text-foreground">{q.label}</td>
                    <td className="px-2 py-2.5 text-right text-foreground-secondary">{formatEuro(q.netto)}</td>
                    <td className="px-5 py-2.5 text-right font-medium text-foreground">{formatEuro(q.brutto - q.netto)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border">
                  <td className="px-5 py-2.5 font-semibold text-foreground">Gesamt</td>
                  <td className="px-2 py-2.5 text-right font-semibold text-foreground">{formatEuro(netto(rechnungen))}</td>
                  <td className="px-5 py-2.5 text-right font-semibold text-foreground">{formatEuro(brutto(rechnungen) - netto(rechnungen))}</td>
                </tr>
              </tfoot>
            </table>
          </Karte>
        </div>

        <Karte titel="Kassenbuch" meta={String(jahr)} aktion={<KassenbuchNeu />}>
          <div className="grid grid-cols-3 border-y border-border">
            {[
              { label: "Einnahmen", wert: einnahmen, klasse: "text-foreground" },
              { label: "Ausgaben", wert: ausgaben, klasse: "text-foreground" },
              { label: "Saldo", wert: saldo, klasse: saldo < 0 ? "text-destructive-text" : "text-foreground" },
            ].map((x, i) => (
              <div key={x.label} className={cn("px-5 py-3", i > 0 && "border-l border-border")}>
                <p className="text-13 text-foreground-secondary">{x.label}</p>
                <p className={cn("mt-0.5 text-lg font-semibold tabular-nums", x.klasse)}>{formatEuro(x.wert)}</p>
              </div>
            ))}
          </div>

          {kasse.length === 0 ? (
            <KarteLeer>Noch keine Einträge im Kassenbuch für {jahr}.</KarteLeer>
          ) : (
            <ul className="max-h-[440px] divide-y divide-border overflow-y-auto scrollbar-thin">
              {kasse.map((k) => {
                const einnahme = k.typ === "einnahme";
                return (
                  <li key={k.id} className="group flex items-center gap-4 px-5 py-2.5">
                    <span className="w-[84px] shrink-0 text-13 tabular-nums text-foreground-secondary">{formatDatum(k.datum)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-13 font-medium text-foreground">
                        {k.kategorie || (einnahme ? "Einnahme" : "Ausgabe")}
                      </span>
                      <span className="block truncate text-xs text-foreground-secondary">
                        {einnahme ? "Einnahme" : "Ausgabe"}
                        {k.beschreibung ? ` · ${k.beschreibung}` : ""}
                        {k.beleg ? ` · Beleg ${k.beleg}` : ""}
                      </span>
                    </span>
                    <span className={cn("shrink-0 text-13 font-semibold tabular-nums", einnahme ? "text-foreground" : "text-destructive-text")}>
                      {einnahme ? "+" : "−"}
                      {formatEuro(Number(k.betrag))}
                    </span>
                    <form action={kassenEintragLoeschen}>
                      <input type="hidden" name="id" value={k.id} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Eintrag löschen"
                        title="Eintrag löschen"
                        className="text-foreground-tertiary opacity-0 transition-opacity hover:text-destructive-text focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <Trash2 />
                      </Button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </Karte>

        <p className="text-xs text-foreground-tertiary">
          Der DATEV-Export enthält alle Rechnungen des gewählten Jahres als Buchungsstapel für deinen Steuerberater (Konten nach SKR03, bei Bedarf anpassen).
        </p>
      </div>
    </div>
  );
}
