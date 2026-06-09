import { createClient } from "@/lib/supabase/server";
import type { Fahrlehrer, Fahrschule } from "@/lib/types";

export interface Kontext {
  userId: string;
  email: string | null;
  fahrlehrer: Fahrlehrer | null;
  fahrschule: Fahrschule | null;
}

/**
 * Lädt den angemeldeten Nutzer samt zugehörigem Fahrlehrer- und
 * Fahrschul-Datensatz. Gibt `null` zurück, wenn niemand angemeldet ist.
 */
export async function getKontext(): Promise<Kontext | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

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

  return {
    userId: user.id,
    email: user.email ?? null,
    fahrlehrer: (fahrlehrer as Fahrlehrer) ?? null,
    fahrschule,
  };
}
