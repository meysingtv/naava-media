"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";

export interface TheoriestundeState {
  error?: string;
  ok?: boolean;
}

export async function theoriestundeErstellen(
  _prev: TheoriestundeState,
  formData: FormData,
): Promise<TheoriestundeState> {
  const kontext = await getKontext();
  if (!kontext?.fahrschule) {
    return { error: "Keine Fahrschule gefunden." };
  }

  const datum = String(formData.get("datum") ?? "").trim();
  const uhrzeit = String(formData.get("uhrzeit") ?? "").trim();
  if (!datum || !uhrzeit) {
    return { error: "Bitte Datum und Uhrzeit angeben." };
  }

  const thema = String(formData.get("thema") ?? "").trim();
  const maxRaw = String(formData.get("max_teilnehmer") ?? "").trim();
  const max = maxRaw ? Number.parseInt(maxRaw, 10) : NaN;

  const supabase = createClient();
  const { error } = await supabase.from("theoriestunde").insert({
    fahrschule_id: kontext.fahrschule.id,
    datum,
    uhrzeit,
    thema: thema === "" ? null : thema,
    max_teilnehmer: Number.isFinite(max) ? max : null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/theorie");
  return { ok: true };
}

export async function theoriestundeLoeschen(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  await supabase.from("theoriestunde").delete().eq("id", id);
  revalidatePath("/theorie");
}

/** Wie `theoriestundeLoeschen`, kehrt danach aber zur Übersicht zurück. */
export async function theoriestundeLoeschenRedirect(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (id) {
    const supabase = createClient();
    await supabase.from("theoriestunde").delete().eq("id", id);
    revalidatePath("/theorie");
  }
  redirect("/theorie");
}

/**
 * Speichert die Anwesenheit einer Theoriestunde. Erwartet im FormData das
 * Feld `theoriestunde_id` sowie für jeden anwesenden Schüler ein Feld
 * `anwesend` mit dessen ID. Anwesende werden als Datensatz gespeichert,
 * Abwesende ergeben keinen Eintrag.
 */
export async function anwesenheitSpeichern(
  _prev: TheoriestundeState,
  formData: FormData,
): Promise<TheoriestundeState> {
  const theoriestundeId = String(formData.get("theoriestunde_id") ?? "");
  if (!theoriestundeId) {
    return { error: "Keine Theoriestunde angegeben." };
  }

  const anwesend = formData
    .getAll("anwesend")
    .map(String)
    .filter((id) => id !== "");

  const supabase = createClient();

  // Bestehende Anwesenheit ersetzen (idempotent).
  const { error: delError } = await supabase
    .from("theorie_teilnahme")
    .delete()
    .eq("theoriestunde_id", theoriestundeId);
  if (delError) {
    return { error: delError.message };
  }

  if (anwesend.length > 0) {
    const { error: insError } = await supabase.from("theorie_teilnahme").insert(
      anwesend.map((schueler_id) => ({
        theoriestunde_id: theoriestundeId,
        schueler_id,
        anwesend: true,
      })),
    );
    if (insError) {
      return { error: insError.message };
    }
  }

  revalidatePath(`/theorie/${theoriestundeId}`);
  revalidatePath("/theorie");
  return { ok: true };
}
