import { cache } from "react";

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
/**
 * `cache()` dedupliziert den Aufruf innerhalb EINES Requests: Layout, Seite und
 * verschachtelte Server-Komponenten teilen sich das Ergebnis, statt Auth +
 * Fahrlehrer + Fahrschule + RPC mehrfach pro Navigation auszuführen.
 * `getSession()` liest die Session lokal aus dem Cookie (kein Netzwerk).
 *
 * Tempo: Fahrlehrer und Fahrschule kommen in EINER Abfrage (Einbettung über
 * `fahrschule_id`), parallel zur Fahrschul-Liste – eine Datenbank-Runde statt
 * drei hintereinander. Schlägt die Einbettung fehl, gilt der alte Weg.
 */
export const getKontext = cache(async (): Promise<Kontext | null> => {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user) return null;

  // RLS liefert nur den Fahrlehrer-Datensatz der AKTIVEN Fahrschule.
  // Parallel dazu: alle Fahrschulen des Nutzers (für den Umschalter).
  const [eigener, liste] = await Promise.all([
    supabase.from("fahrlehrer").select("*, fahrschule!fahrschule_id(*)").eq("user_id", user.id).maybeSingle(),
    supabase.rpc("meine_fahrschulen"),
  ]);

  let fahrlehrer: Fahrlehrer | null = null;
  let fahrschule: Fahrschule | null = null;
  if (!eigener.error) {
    const zeile = eigener.data as (Fahrlehrer & { fahrschule?: Fahrschule | null }) | null;
    if (zeile) {
      const { fahrschule: eingebettet, ...rest } = zeile;
      fahrlehrer = rest as Fahrlehrer;
      fahrschule = eingebettet ?? null;
    }
  } else {
    const { data } = await supabase.from("fahrlehrer").select("*").eq("user_id", user.id).maybeSingle();
    fahrlehrer = (data as Fahrlehrer | null) ?? null;
  }
  if (fahrlehrer && !fahrschule) {
    const { data } = await supabase.from("fahrschule").select("*").eq("id", fahrlehrer.fahrschule_id).maybeSingle();
    fahrschule = (data as Fahrschule | null) ?? null;
  }

  // Resilient: falls die Migration noch nicht eingespielt ist, Fallback.
  let fahrschulen: FahrschulMitgliedschaft[] = [];
  if (!liste.error && liste.data) {
    fahrschulen = liste.data as FahrschulMitgliedschaft[];
  }
  if (fahrschulen.length === 0 && fahrschule) {
    fahrschulen = [
      {
        id: fahrschule.id,
        name: fahrschule.name,
        ort: fahrschule.ort,
        logo_url: fahrschule.logo_url,
        rolle: fahrlehrer?.rolle ?? "fahrlehrer",
      },
    ];
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    fahrlehrer,
    fahrschule,
    fahrschulen,
  };
});
