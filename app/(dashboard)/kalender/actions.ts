"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import type { FahrstundeTyp } from "@/lib/types";

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

export async function fahrstundeErstellen(
  _prev: KalenderState,
  formData: FormData,
): Promise<KalenderState> {
  const kontext = await getKontext();
  if (!kontext?.fahrschule) {
    return { error: "Keine Fahrschule gefunden." };
  }

  const datum = leerZuNull(formData.get("datum"));
  const uhrzeit = leerZuNull(formData.get("uhrzeit"));
  if (!datum || !uhrzeit) {
    return { error: "Bitte Datum und Uhrzeit angeben." };
  }

  const dauer = Number(formData.get("dauer_minuten") ?? 45) || 45;
  const fahrzeugId = leerZuNull(formData.get("fahrzeug_id"));

  const supabase = createClient();

  // Fahrzeug-Konflikterkennung: Überschneidung am selben Tag prüfen.
  if (fahrzeugId) {
    const { data: bestehende } = await supabase
      .from("fahrstunde")
      .select("uhrzeit, dauer_minuten")
      .eq("fahrzeug_id", fahrzeugId)
      .eq("datum", datum)
      .neq("status", "ausgefallen");

    const start = minutenSeitMitternacht(uhrzeit);
    const ende = start + dauer;
    const konflikt = (bestehende ?? []).some((b) => {
      const bStart = minutenSeitMitternacht(b.uhrzeit);
      const bEnde = bStart + (b.dauer_minuten ?? 45);
      return start < bEnde && ende > bStart;
    });

    if (konflikt) {
      return { error: "Dieses Fahrzeug ist zu dieser Zeit bereits gebucht." };
    }
  }

  const { error } = await supabase.from("fahrstunde").insert({
    fahrschule_id: kontext.fahrschule.id,
    schueler_id: leerZuNull(formData.get("schueler_id")),
    fahrlehrer_id: leerZuNull(formData.get("fahrlehrer_id")),
    fahrzeug_id: fahrzeugId,
    datum,
    uhrzeit,
    dauer_minuten: dauer,
    typ: (String(formData.get("typ") ?? "normal") as FahrstundeTyp) || "normal",
    status: "geplant",
    notiz: leerZuNull(formData.get("notiz")),
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/kalender");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function fahrstundeLoeschen(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  await supabase.from("fahrstunde").delete().eq("id", id);
  revalidatePath("/kalender");
}
