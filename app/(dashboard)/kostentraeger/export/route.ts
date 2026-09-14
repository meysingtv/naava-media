import { createClient } from "@/lib/supabase/server";
import type { Fahrschueler, Rechnung } from "@/lib/types";

export const dynamic = "force-dynamic";

function betragDe(n: number): string {
  return n.toFixed(2).replace(".", ",");
}
function csvFeld(v: string | number): string {
  const s = String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function slug(s: string): string {
  return s.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "") || "traeger";
}

export async function GET(request: Request) {
  const traeger = new URL(request.url).searchParams.get("traeger") ?? "";
  const supabase = createClient();

  const [schuelerRes, rechnungRes] = await Promise.all([
    supabase
      .from("fahrschueler")
      .select("id, vorname, nachname, kundennummer, kostentraeger, vorgangsnummer")
      .eq("kostentraeger", traeger)
      .returns<Pick<Fahrschueler, "id" | "vorname" | "nachname" | "kundennummer" | "kostentraeger" | "vorgangsnummer">[]>(),
    supabase.from("rechnung").select("schueler_id, betrag_brutto, status").returns<
      Pick<Rechnung, "schueler_id" | "betrag_brutto" | "status">[]
    >(),
  ]);

  const schueler = schuelerRes.data ?? [];
  const rechnungen = rechnungRes.data ?? [];

  const offenMap: Record<string, number> = {};
  const gesamtMap: Record<string, number> = {};
  for (const r of rechnungen) {
    if (!r.schueler_id) continue;
    gesamtMap[r.schueler_id] = (gesamtMap[r.schueler_id] ?? 0) + Number(r.betrag_brutto ?? 0);
    if (r.status !== "bezahlt") {
      offenMap[r.schueler_id] = (offenMap[r.schueler_id] ?? 0) + Number(r.betrag_brutto ?? 0);
    }
  }

  const kopf = ["Kundennr.", "Name", "Vorgangsnummer", "Rechnungsbetrag gesamt", "davon offen"];
  const zeilen = schueler.map((s) =>
    [
      s.kundennummer ?? "",
      `${s.vorname} ${s.nachname}`,
      s.vorgangsnummer ?? "",
      betragDe(gesamtMap[s.id] ?? 0),
      betragDe(offenMap[s.id] ?? 0),
    ]
      .map(csvFeld)
      .join(";"),
  );

  const summeOffen = schueler.reduce((sum, s) => sum + (offenMap[s.id] ?? 0), 0);
  const summeGesamt = schueler.reduce((sum, s) => sum + (gesamtMap[s.id] ?? 0), 0);
  const summe = ["", `SUMME ${traeger}`, "", betragDe(summeGesamt), betragDe(summeOffen)]
    .map(csvFeld)
    .join(";");

  const csv = "﻿" + [kopf.map(csvFeld).join(";"), ...zeilen, summe].join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="Sammelabrechnung-${slug(traeger)}.csv"`,
    },
  });
}
