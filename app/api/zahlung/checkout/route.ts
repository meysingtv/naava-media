import { NextResponse, type NextRequest } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { basisUrl } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { checkoutStarten } from "@/lib/zahlung/checkout";

export const dynamic = "force-dynamic";

/** Erlaubte Rücksprünge in die Schüler-App (eigenes Schema oder Expo Go). */
const APP_RUECKSPRUNG = /^(fahrbar-schueler|exps?):\/\//i;

/**
 * Startet eine Online-Zahlung für die Schüler-App. Anmeldung per
 * `Authorization: Bearer <Supabase-Token>`; ohne Header zählt die
 * Portal-Sitzung (Cookie). Antwort: `{ url }` der Stripe-Bezahlseite.
 */
export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  let nutzer: { id: string; email?: string | null } | null = null;
  if (token) {
    const supabase = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    nutzer = (await supabase.auth.getUser(token)).data.user;
  } else {
    nutzer = (await createClient().auth.getUser()).data.user;
  }
  if (!nutzer) return NextResponse.json({ fehler: "Bitte melde dich erneut an." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { rechnung_ids?: unknown; rueckkehr?: unknown } | null;
  const rechnungIds = Array.isArray(body?.rechnung_ids) ? body.rechnung_ids.map(String) : [];
  const rueckkehr = typeof body?.rueckkehr === "string" && APP_RUECKSPRUNG.test(body.rueckkehr) ? body.rueckkehr : null;

  const zurueck = (vorgang: string, ergebnis: "erfolg" | "abbruch") => {
    const url = new URL(`${basisUrl()}/zahlung/zurueck`);
    url.searchParams.set("ergebnis", ergebnis);
    url.searchParams.set("vorgang", vorgang);
    if (rueckkehr) url.searchParams.set("ziel", rueckkehr);
    return url.toString();
  };

  const ergebnis = await checkoutStarten({
    userId: nutzer.id,
    email: nutzer.email ?? null,
    rechnungIds,
    erfolgUrl: (v) => zurueck(v, "erfolg"),
    abbruchUrl: (v) => zurueck(v, "abbruch"),
  });
  if ("fehler" in ergebnis) return NextResponse.json({ fehler: ergebnis.fehler }, { status: ergebnis.status });
  return NextResponse.json({ url: ergebnis.url, vorgang_id: ergebnis.vorgangId });
}
