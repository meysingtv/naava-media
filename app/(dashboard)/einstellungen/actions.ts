"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";

export interface EinstellungenState {
  error?: string;
  message?: string;
}

function leerZuNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

/** Aktualisiert das Firmenprofil der Fahrschule (nur Chef – per RLS abgesichert). */
export async function fahrschuleAktualisieren(
  _prev: EinstellungenState,
  formData: FormData,
): Promise<EinstellungenState> {
  const kontext = await getKontext();
  if (!kontext?.fahrschule) {
    return { error: "Keine Fahrschule gefunden." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Der Name der Fahrschule darf nicht leer sein." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("fahrschule")
    .update({
      name,
      strasse: leerZuNull(formData.get("strasse")),
      plz: leerZuNull(formData.get("plz")),
      ort: leerZuNull(formData.get("ort")),
      telefon: leerZuNull(formData.get("telefon")),
      email: leerZuNull(formData.get("email")),
      website: leerZuNull(formData.get("website")),
      iban: leerZuNull(formData.get("iban")),
      steuernummer: leerZuNull(formData.get("steuernummer")),
    })
    .eq("id", kontext.fahrschule.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/einstellungen");
  revalidatePath("/", "layout");
  return { message: "Änderungen wurden gespeichert." };
}
