import { createClient } from "@/lib/supabase/server";
import type { Rechnung } from "@/lib/types";

export const dynamic = "force-dynamic";

// Erlöskonten je Steuersatz (SKR03-nah – der Steuerberater passt final an).
function erloesKonto(steuersatz: number): string {
  if (steuersatz >= 19) return "8400";
  if (steuersatz >= 7) return "8300";
  return "8200";
}

function betragDe(n: number): string {
  return n.toFixed(2).replace(".", ",");
}
function datumDe(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}
function csvFeld(v: string | number): string {
  const s = String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const jahr = url.searchParams.get("jahr") ?? String(new Date().getFullYear());

  const supabase = createClient();
  const { data } = await supabase
    .from("rechnung")
    .select("*, fahrschueler(vorname, nachname, kundennummer)")
    .gte("rechnungsdatum", `${jahr}-01-01`)
    .lte("rechnungsdatum", `${jahr}-12-31`)
    .order("rechnungsdatum", { ascending: true })
    .returns<(Rechnung & { fahrschueler: { vorname: string; nachname: string; kundennummer: number | null } | null })[]>();

  const rechnungen = data ?? [];

  const kopf = [
    "Umsatz (Brutto)",
    "Soll/Haben-Kennzeichen",
    "WKZ Umsatz",
    "Konto",
    "Gegenkonto (ohne BU-Schlüssel)",
    "Belegdatum",
    "Belegfeld 1",
    "Buchungstext",
    "Steuersatz %",
    "Status",
  ];

  const zeilen = rechnungen.map((r) => {
    const schueler = r.fahrschueler
      ? `${r.fahrschueler.vorname} ${r.fahrschueler.nachname}`
      : "Ohne Schüler";
    // Debitor-Konto: 10000 + Kundennummer (SKR03-Bereich Debitoren), sonst Sammelkonto 1400.
    const debitor = r.fahrschueler?.kundennummer != null ? 10000 + r.fahrschueler.kundennummer : 1400;
    return [
      betragDe(Number(r.betrag_brutto ?? 0)),
      "S",
      "EUR",
      String(debitor),
      erloesKonto(Number(r.steuersatz ?? 19)),
      datumDe(r.rechnungsdatum),
      r.nummer,
      `Fahrschule ${schueler}`,
      String(r.steuersatz ?? 19),
      r.status,
    ]
      .map(csvFeld)
      .join(";");
  });

  const csv = "﻿" + [kopf.map(csvFeld).join(";"), ...zeilen].join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="DATEV-Buchungsstapel-${jahr}.csv"`,
    },
  });
}
