/** Rundet auf eine „schöne" Obergrenze für eine Diagrammachse (100, 250, 500, 1.000 …). */
export function schoeneObergrenze(wert: number): number {
  if (wert <= 0) return 100;
  const basis = Math.pow(10, Math.floor(Math.log10(wert)));
  const n = wert / basis;
  const stufe = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return stufe * basis;
}

/** „1.250 €" – ohne Nachkommastellen, für Achsen und Legenden. */
export function euroKurz(wert: number): string {
  return `${wert.toLocaleString("de-DE", { maximumFractionDigits: 0 })} €`;
}

export interface MonatsWert {
  /** JJJJ-MM */
  schluessel: string;
  /** „Sep" */
  label: string;
  gestellt: number;
  eingang: number;
}

/**
 * Die letzten `anzahl` Monate bis einschließlich des Monats von `heute`,
 * jeweils mit gestellten Rechnungsbeträgen und Zahlungseingängen.
 */
export function monatsWerte(
  heute: string,
  anzahl: number,
  rechnungen: { betrag_brutto: number | null; rechnungsdatum: string | null }[],
  zahlungen: { betrag: number | null; datum: string | null }[],
): MonatsWert[] {
  const [jahr, monat] = heute.split("-").map(Number);
  return Array.from({ length: anzahl }, (_, i) => {
    const d = new Date(Date.UTC(jahr, monat - anzahl + i, 1));
    const schluessel = d.toISOString().slice(0, 7);
    return {
      schluessel,
      label: d.toLocaleDateString("de-DE", { month: "short", timeZone: "UTC" }).replace(".", ""),
      gestellt: rechnungen
        .filter((r) => (r.rechnungsdatum ?? "").startsWith(schluessel))
        .reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0),
      eingang: zahlungen.filter((z) => (z.datum ?? "").startsWith(schluessel)).reduce((s, z) => s + Number(z.betrag ?? 0), 0),
    };
  });
}
