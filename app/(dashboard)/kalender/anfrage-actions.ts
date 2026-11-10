"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { darf } from "@/lib/zugriff";
import { dbFehlerText } from "@/lib/db-fehler";

export interface AnfrageErgebnis {
  ok?: boolean;
  error?: string;
}

function meldung(m: string): string {
  return dbFehlerText(m);
}

/** Anfrage annehmen: legt die Fahrstunde an (Überschneidungen prüft die Datenbank). */
export async function anfrageAnnehmen(eingabe: {
  id: string;
  fahrlehrerId: string | null;
  fahrzeugId: string | null;
  datum: string;
  uhrzeit: string;
  dauer: number;
}): Promise<AnfrageErgebnis> {
  if (!(await darf("/kalender"))) return { error: "Dafür fehlt dir die Berechtigung." };
  if (!eingabe.fahrlehrerId) return { error: "Bitte einen Fahrlehrer wählen." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eingabe.datum)) return { error: "Bitte ein gültiges Datum wählen." };
  if (!/^\d{2}:\d{2}/.test(eingabe.uhrzeit)) return { error: "Bitte eine gültige Uhrzeit wählen." };

  const { error } = await createClient().rpc("fahrstunde_anfrage_annehmen", {
    p_id: eingabe.id,
    p_fahrlehrer: eingabe.fahrlehrerId,
    p_fahrzeug: eingabe.fahrzeugId,
    p_datum: eingabe.datum,
    p_uhrzeit: eingabe.uhrzeit.slice(0, 5),
    p_dauer: eingabe.dauer === 90 ? 90 : 45,
  });
  if (error) return { error: meldung(error.message) };

  revalidatePath("/kalender");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Anfrage ablehnen – der Grund erscheint beim Schüler im Portal. */
export async function anfrageAblehnen(id: string, grund: string): Promise<AnfrageErgebnis> {
  if (!(await darf("/kalender"))) return { error: "Dafür fehlt dir die Berechtigung." };

  const { data, error } = await createClient().rpc("fahrstunde_anfrage_ablehnen", {
    p_id: id,
    p_grund: grund.trim().slice(0, 500),
  });
  if (error) return { error: meldung(error.message) };
  if (!data) return { error: "Diese Anfrage wurde schon bearbeitet." };

  revalidatePath("/kalender");
  revalidatePath("/dashboard");
  return { ok: true };
}
