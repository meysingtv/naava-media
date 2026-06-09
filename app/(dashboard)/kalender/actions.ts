"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import type { FahrstundeStatus, FahrstundeTyp } from "@/lib/types";

export interface KalenderState {
  error?: string;
  ok?: boolean;
}

function leerZuNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

function minutenSeitMitternacht(uhrzeit: string): number {
  const [h, m] = uhrzeit.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Legt eine Fahrstunde an oder aktualisiert sie (abhängig vom Feld `id`). */
export async function fahrstundeSpeichern(
  _prev: KalenderState,
  formData: FormData,
): Promise<KalenderState> {
  const kontext = await getKontext();
  if (!kontext?.fahrschule) {
    return { error: "Keine Fahrschule gefunden." };
  }

  const id = leerZuNull(formData.get("id"));
  const datum = leerZuNull(formData.get("datum"));
  const uhrzeit = leerZuNull(formData.get("uhrzeit"));
  if (!datum || !uhrzeit) {
    return { error: "Bitte Datum und Uhrzeit angeben." };
  }

  const dauer = Number(formData.get("dauer_minuten") ?? 45) || 45;
  const fahrzeugId = leerZuNull(formData.get("fahrzeug_id"));

  const supabase = createClient();

  // Fahrzeug-Konflikterkennung (eigene Stunde beim Bearbeiten ausschließen).
  if (fahrzeugId) {
    let query = supabase
      .from("fahrstunde")
      .select("id, uhrzeit, dauer_minuten")
      .eq("fahrzeug_id", fahrzeugId)
      .eq("datum", datum)
      .neq("status", "ausgefallen");
    if (id) query = query.neq("id", id);

    const { data: bestehende } = await query;
    const start = minutenSeitMitternacht(uhrzeit);
    const ende = start + dauer;
    const konflikt = (bestehende ?? []).some((b: { uhrzeit: string; dauer_minuten: number | null }) => {
      const bStart = minutenSeitMitternacht(b.uhrzeit);
      const bEnde = bStart + (b.dauer_minuten ?? 45);
      return start < bEnde && ende > bStart;
    });
    if (konflikt) {
      return { error: "Dieses Fahrzeug ist zu dieser Zeit bereits gebucht." };
    }
  }

  const datensatz = {
    schueler_id: leerZuNull(formData.get("schueler_id")),
    fahrlehrer_id: leerZuNull(formData.get("fahrlehrer_id")),
    fahrzeug_id: fahrzeugId,
    datum,
    uhrzeit,
    dauer_minuten: dauer,
    typ: (String(formData.get("typ") ?? "normal") as FahrstundeTyp) || "normal",
    notiz: leerZuNull(formData.get("notiz")),
  };

  if (id) {
    const { error } = await supabase.from("fahrstunde").update(datensatz).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("fahrstunde").insert({
      ...datensatz,
      fahrschule_id: kontext.fahrschule.id,
      status: "geplant",
    });
    if (error) return { error: error.message };
  }

  revalidatePath("/kalender");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function fahrstundeStatusSetzen(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "geplant") as FahrstundeStatus;
  if (!id) return;

  const supabase = createClient();
  await supabase.from("fahrstunde").update({ status }).eq("id", id);
  revalidatePath("/kalender");
  revalidatePath("/dashboard");
}

export async function fahrstundeLoeschen(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  await supabase.from("fahrstunde").delete().eq("id", id);
  revalidatePath("/kalender");
  revalidatePath("/dashboard");
}
