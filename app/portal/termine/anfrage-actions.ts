"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export interface AnfrageZustand {
  ok?: boolean;
  error?: string;
}

/** Datenbank-Meldungen verständlich machen – eigene Meldungen der Funktionen bleiben, wie sie sind. */
function verstaendlich(meldung: string): string {
  if (/schema cache|could not find the function|(column|relation|function) .* does not exist/i.test(meldung)) {
    return "Online-Anfragen sind bei deiner Fahrschule gerade nicht verfügbar. Bitte später noch einmal versuchen.";
  }
  return meldung;
}

/** Wunschtermin anfragen – Regeln (Freischaltung, Vorlauf, offene Anfragen) prüft die Datenbank. */
export async function anfrageStellen(_prev: AnfrageZustand, formData: FormData): Promise<AnfrageZustand> {
  const datum = String(formData.get("datum") ?? "");
  const uhrzeit = String(formData.get("uhrzeit") ?? "");
  const dauer = Number(formData.get("dauer") ?? 45);
  const fahrlehrer = String(formData.get("fahrlehrer") ?? "");
  const notiz = String(formData.get("notiz") ?? "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) return { error: "Bitte ein Datum wählen." };
  if (!/^\d{2}:\d{2}$/.test(uhrzeit)) return { error: "Bitte eine Uhrzeit wählen." };

  const supabase = createClient();
  const { error } = await supabase.rpc("fahrstunde_anfragen", {
    p_datum: datum,
    p_uhrzeit: uhrzeit,
    p_dauer: dauer === 90 ? 90 : 45,
    p_fahrlehrer: fahrlehrer || null,
    p_notiz: notiz.slice(0, 500),
  });
  if (error) return { error: verstaendlich(error.message) };

  revalidatePath("/portal/termine");
  revalidatePath("/portal");
  return { ok: true };
}

/** Offene Anfrage zurückziehen. */
export async function anfrageZurueckziehen(id: string): Promise<AnfrageZustand> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fahrstunde_anfrage_zurueckziehen", { p_id: id });
  if (error) return { error: verstaendlich(error.message) };
  if (!data) return { error: "Diese Anfrage wurde schon bearbeitet." };

  revalidatePath("/portal/termine");
  revalidatePath("/portal");
  return { ok: true };
}
