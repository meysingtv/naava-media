import { createClient } from "@/lib/supabase/server";
import { FAHRSTUNDE_TYPEN } from "@/lib/constants";
import type { Fahrstunde } from "@/lib/types";

export const dynamic = "force-dynamic";

function stempel(datum: string, uhrzeit: string, plusMin = 0): string {
  // Lokale Zeit als "floating" (ohne Z) – der Kalender nimmt die Gerätezeit.
  const [y, m, d] = datum.slice(0, 10).split("-").map(Number);
  const [hh, mm] = uhrzeit.slice(0, 5).split(":").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0);
  dt.setMinutes(dt.getMinutes() + plusMin);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}${p(dt.getMonth() + 1)}${p(dt.getDate())}T${p(dt.getHours())}${p(dt.getMinutes())}00`;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data } = await supabase.from("fahrstunde").select("*").eq("id", params.id).maybeSingle();
  if (!data) return new Response("Nicht gefunden", { status: 404 });

  const f = data as Fahrstunde;
  const titel = FAHRSTUNDE_TYPEN[f.typ]?.label ?? "Fahrstunde";
  const start = stempel(f.datum, f.uhrzeit);
  const ende = stempel(f.datum, f.uhrzeit, f.dauer_minuten || 45);

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FahrschulApp//Portal//DE",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${f.id}@fahrschulapp`,
    `DTSTAMP:${stempel(f.datum, f.uhrzeit)}`,
    `DTSTART:${start}`,
    `DTEND:${ende}`,
    `SUMMARY:${titel} – Fahrschule`,
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Erinnerung Fahrstunde",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="fahrstunde.ics"`,
    },
  });
}
