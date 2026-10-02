import { createClient } from "@/lib/supabase/server";
import type { Fahrlehrer, Fahrstunde } from "@/lib/types";
import { darf } from "@/lib/zugriff";

export const dynamic = "force-dynamic";

function betragDe(n: number): string {
  return n.toFixed(2).replace(".", ",");
}
function csvFeld(v: string | number): string {
  const s = String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: Request) {
  if (!(await darf("/lohn"))) return new Response("Kein Zugriff", { status: 403 });
  const monat =
    new URL(request.url).searchParams.get("monat") ??
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const [y, m] = monat.split("-").map(Number);
  const start = `${monat}-01`;
  const ende = new Date(y, m, 0).toISOString().slice(0, 10);

  const supabase = createClient();
  const [lehrerRes, stundenRes] = await Promise.all([
    supabase.from("fahrlehrer").select("*").order("nachname").returns<Fahrlehrer[]>(),
    supabase
      .from("fahrstunde")
      .select("fahrlehrer_id, dauer_minuten")
      .gte("datum", start)
      .lte("datum", ende)
      .eq("status", "abgeschlossen")
      .returns<Pick<Fahrstunde, "fahrlehrer_id" | "dauer_minuten">[]>(),
  ]);

  const anzahl: Record<string, number> = {};
  const minuten: Record<string, number> = {};
  for (const f of stundenRes.data ?? []) {
    if (!f.fahrlehrer_id) continue;
    anzahl[f.fahrlehrer_id] = (anzahl[f.fahrlehrer_id] ?? 0) + 1;
    minuten[f.fahrlehrer_id] = (minuten[f.fahrlehrer_id] ?? 0) + (f.dauer_minuten ?? 45);
  }

  const kopf = ["Fahrlehrer", "Fahrstunden", "Stunden", "EUR/Fahrstunde", "EUR/Stunde", "Lohn EUR"];
  const zeilen = (lehrerRes.data ?? []).map((f) => {
    const n = anzahl[f.id] ?? 0;
    const std = (minuten[f.id] ?? 0) / 60;
    const lohn =
      f.lohn_pro_fahrstunde != null
        ? n * Number(f.lohn_pro_fahrstunde)
        : f.stundenlohn != null
          ? std * Number(f.stundenlohn)
          : 0;
    return [
      `${f.vorname} ${f.nachname}`,
      n,
      std.toFixed(1).replace(".", ","),
      f.lohn_pro_fahrstunde != null ? betragDe(Number(f.lohn_pro_fahrstunde)) : "",
      f.stundenlohn != null ? betragDe(Number(f.stundenlohn)) : "",
      betragDe(lohn),
    ]
      .map(csvFeld)
      .join(";");
  });

  const csv = "﻿" + [kopf.map(csvFeld).join(";"), ...zeilen].join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="Lohn-${monat}.csv"`,
    },
  });
}
