import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { vorgangAbgleichen } from "@/lib/zahlung/buchung";
import { nutzerAusAnfrage } from "@/lib/zahlung/nutzer";

export const dynamic = "force-dynamic";

/**
 * Die App fragt nach dem Schließen der Bezahlseite nach: Der Server holt den
 * Stand bei Stripe ab und verbucht die Zahlung, falls sie durch ist.
 * Antwort: `{ status }` – offen | in_pruefung | bezahlt | …
 */
export async function POST(request: NextRequest) {
  const nutzer = await nutzerAusAnfrage(request);
  if (!nutzer) return NextResponse.json({ fehler: "Bitte melde dich erneut an." }, { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ fehler: "Online-Zahlung ist noch nicht eingerichtet." }, { status: 503 });

  const body = (await request.json().catch(() => null)) as { vorgang_id?: unknown } | null;
  const vorgangId = typeof body?.vorgang_id === "string" ? body.vorgang_id : "";

  // Nur eigene Vorgänge abgleichen.
  const [{ data: schueler }, { data: vorgang }] = await Promise.all([
    admin.from("fahrschueler").select("id").eq("user_id", nutzer.id).maybeSingle(),
    admin.from("zahlungsvorgang").select("schueler_id").eq("id", vorgangId).maybeSingle(),
  ]);
  if (!schueler || !vorgang || vorgang.schueler_id !== schueler.id) {
    return NextResponse.json({ fehler: "Zahlung nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json({ status: await vorgangAbgleichen(vorgangId) });
}
