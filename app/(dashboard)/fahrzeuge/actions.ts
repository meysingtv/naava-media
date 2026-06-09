"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";

export interface FahrzeugState {
  error?: string;
  ok?: boolean;
}

function leerZuNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

export async function fahrzeugErstellen(
  _prev: FahrzeugState,
  formData: FormData,
): Promise<FahrzeugState> {
  const kontext = await getKontext();
  if (!kontext?.fahrschule) {
    return { error: "Keine Fahrschule gefunden." };
  }

  const kennzeichen = String(formData.get("kennzeichen") ?? "").trim();
  if (!kennzeichen) {
    return { error: "Bitte ein Kennzeichen angeben." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("fahrzeug").insert({
    fahrschule_id: kontext.fahrschule.id,
    kennzeichen,
    marke: leerZuNull(formData.get("marke")),
    modell: leerZuNull(formData.get("modell")),
    klasse: leerZuNull(formData.get("klasse")),
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/fahrzeuge");
  return { ok: true };
}

export async function fahrzeugAktivSetzen(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const aktiv = formData.get("aktiv") === "true";
  if (!id) return;

  const supabase = createClient();
  await supabase.from("fahrzeug").update({ aktiv }).eq("id", id);
  revalidatePath("/fahrzeuge");
}

export async function fahrzeugLoeschen(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  await supabase.from("fahrzeug").delete().eq("id", id);
  revalidatePath("/fahrzeuge");
}
