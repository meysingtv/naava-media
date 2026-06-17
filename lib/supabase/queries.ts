import { createClient } from "@/lib/supabase/server";
import type { Fahrlehrer, Fahrschule, FahrschulMitgliedschaft } from "@/lib/types";

export interface Kontext {
  userId: string;
  email: string | null;
  fahrlehrer: Fahrlehrer | null;
  fahrschule: Fahrschule | null;
  /** Alle Fahrschulen, zu denen der Nutzer gehört (für den Umschalter). */
  fahrschulen: FahrschulMitgliedschaft[];
}

/**
 * Lädt den angemeldeten Nutzer samt aktivem Fahrlehrer-/Fahrschul-Datensatz
 * und der Liste aller Fahrschulen, zu denen der Nutzer gehört.
 * Gibt `null` zurück, wenn niemand angemeldet ist.
 */
export async function getKontext(): Promise<Kontext | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // RLS liefert nur den Fahrlehrer-Datensatz der AKTIVEN Fahrschule.
  const { data: fahrlehrer } = await supabase
    .from("fahrlehrer")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  let fahrschule: Fahrschule | null = null;
  if (fahrlehrer) {
    const { data } = await supabase
      .from("fahrschule")
      .select("*")
      .eq("id", fahrlehrer.fahrschule_id)
      .maybeSingle();
    fahrschule = data ?? null;
  }

  // Alle Fahrschulen des Nutzers (für den Umschalter oben links).
  // Resilient: falls die Migration noch nicht eingespielt ist, Fallback.
  let fahrschulen: FahrschulMitgliedschaft[] = [];
  const { data: alle, error: rpcError } = await supabase.rpc("meine_fahrschulen");
  if (!rpcError && alle) {
    fahrschulen = alle as FahrschulMitgliedschaft[];
  }
  if (fahrschulen.length === 0 && fahrschule) {
    fahrschulen = [
      {
        id: fahrschule.id,
        name: fahrschule.name,
        ort: fahrschule.ort,
        logo_url: fahrschule.logo_url,
        rolle: (fahrlehrer as Fahrlehrer | null)?.rolle ?? "fahrlehrer",
      },
    ];
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    fahrlehrer: (fahrlehrer as Fahrlehrer) ?? null,
    fahrschule,
    fahrschulen,
  };
}
