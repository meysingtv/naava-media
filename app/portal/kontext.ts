import { createClient } from "@/lib/supabase/server";
import type { Fahrschueler } from "@/lib/types";

export interface SchuelerKontext {
  schueler: Fahrschueler | null;
  schule: { name: string; ort: string | null; logo_url: string | null } | null;
}

/** Lädt den eingeloggten Fahrschüler (nur eigene Zeile via RLS) + Branding. */
export async function getSchuelerKontext(): Promise<SchuelerKontext> {
  const supabase = createClient();

  const [{ data: schueler }, { data: schule }] = await Promise.all([
    supabase.from("fahrschueler").select("*").maybeSingle(),
    supabase.rpc("schueler_fahrschule"),
  ]);

  const s = Array.isArray(schule) ? schule[0] ?? null : null;
  return { schueler: (schueler as Fahrschueler) ?? null, schule: s };
}
