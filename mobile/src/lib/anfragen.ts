import { useEffect } from "react";
import * as Notifications from "expo-notifications";

import { supabase } from "./supabase";
import { erinnerungenErlaubt } from "./notifications";
import { formatDatumKurz, formatUhrzeit } from "./format";

/**
 * Fahrstunden-Anfragen aus dem Schüler-Portal – dieselben Datenbank-
 * Funktionen wie die Website (`fahrstunde_anfrage_annehmen` / `_ablehnen`),
 * damit Regeln und Überschneidungsprüfung überall gleich sind.
 */

/** Eigene Fahrlehrer-ID in der aktiven Fahrschule (RLS liefert nur diese Fahrschule). */
export async function meineFahrlehrerId(): Promise<string | null> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return null;
  const { data } = await supabase.from("fahrlehrer").select("id").eq("user_id", uid).limit(1);
  return data?.[0]?.id ?? null;
}

function verstaendlich(meldung: string): string {
  if (/could not find the function|does not exist|schema cache/i.test(meldung)) {
    return "Die Anfragen sind in der Datenbank noch nicht eingerichtet (Update 0020).";
  }
  return meldung;
}

export async function anfrageAnnehmen(eingabe: {
  id: string;
  fahrlehrerId: string;
  fahrzeugId?: string | null;
}): Promise<string | null> {
  const { error } = await supabase.rpc("fahrstunde_anfrage_annehmen", {
    p_id: eingabe.id,
    p_fahrlehrer: eingabe.fahrlehrerId,
    p_fahrzeug: eingabe.fahrzeugId ?? null,
    p_datum: null,
    p_uhrzeit: null,
    p_dauer: null,
  });
  return error ? verstaendlich(error.message) : null;
}

export async function anfrageAblehnen(id: string, grund: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("fahrstunde_anfrage_ablehnen", { p_id: id, p_grund: grund.trim() });
  if (error) return verstaendlich(error.message);
  return data ? null : "Diese Anfrage wurde schon bearbeitet.";
}

/**
 * Meldet neue Anfragen als Mitteilung, solange die App läuft (Realtime).
 * Für Mitteilungen bei geschlossener App braucht es später Push über einen Server.
 */
export function useNeueAnfragenMelden(aktiv: boolean) {
  useEffect(() => {
    if (!aktiv) return;
    const kanal = supabase
      .channel("anfragen-neu")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "fahrstunde_anfrage" }, async (payload) => {
        if (!(await erinnerungenErlaubt())) return;
        const neu = payload.new as { datum?: string; uhrzeit?: string; dauer_minuten?: number };
        const wann =
          neu.datum && neu.uhrzeit ? `${formatDatumKurz(neu.datum)}, ${formatUhrzeit(neu.uhrzeit)} Uhr` : "neuer Wunschtermin";
        await Notifications.scheduleNotificationAsync({
          content: { title: "Neue Fahrstunden-Anfrage", body: `${wann}${neu.dauer_minuten ? ` · ${neu.dauer_minuten} Min.` : ""}` },
          trigger: null,
        });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(kanal);
    };
  }, [aktiv]);
}
