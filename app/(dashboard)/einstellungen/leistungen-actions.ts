"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";

function leerZuNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

export interface LeistungState {
  error?: string;
  ok?: boolean;
}

export async function leistungErstellen(
  _prev: LeistungState,
  formData: FormData,
): Promise<LeistungState> {
  const kontext = await getKontext();
  if (!kontext?.fahrschule) return { error: "Nicht angemeldet." };
  if (kontext.fahrlehrer?.rolle !== "chef") return { error: "Nur der Geschäftsführer darf die Preisliste ändern." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Bitte einen Namen eingeben." };

  const supabase = createClient();
  const { error } = await supabase.from("leistung").insert({
    fahrschule_id: kontext.fahrschule.id,
    name,
    kategorie: leerZuNull(formData.get("kategorie")),
    preis: Number(formData.get("preis") ?? 0) || 0,
    einheit: String(formData.get("einheit") ?? "Stk").trim() || "Stk",
    klasse: leerZuNull(formData.get("klasse")),
    aktiv: true,
  });
  if (error) return { error: error.message };

  revalidatePath("/einstellungen");
  return { ok: true };
}

export async function leistungLoeschen(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = createClient();
  await supabase.from("leistung").delete().eq("id", id);
  revalidatePath("/einstellungen");
}
