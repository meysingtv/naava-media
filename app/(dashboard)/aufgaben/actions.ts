"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";

function leerZuNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

export interface AufgabeState {
  error?: string;
  ok?: boolean;
}

export async function aufgabeErstellen(
  _prev: AufgabeState,
  formData: FormData,
): Promise<AufgabeState> {
  const kontext = await getKontext();
  if (!kontext?.fahrschule) return { error: "Nicht angemeldet." };

  const titel = String(formData.get("titel") ?? "").trim();
  if (!titel) return { error: "Bitte einen Titel eingeben." };

  const supabase = createClient();
  const { error } = await supabase.from("aufgabe").insert({
    fahrschule_id: kontext.fahrschule.id,
    titel,
    prioritaet: String(formData.get("prioritaet") ?? "mittel"),
    faellig_am: leerZuNull(formData.get("faellig_am")),
    schueler_id: leerZuNull(formData.get("schueler_id")),
    status: "offen",
  });
  if (error) return { error: error.message };

  revalidatePath("/aufgaben");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function aufgabeStatusSetzen(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "offen");
  if (!id) return;
  const supabase = createClient();
  await supabase.from("aufgabe").update({ status }).eq("id", id);
  revalidatePath("/aufgaben");
  revalidatePath("/dashboard");
}

export async function aufgabeLoeschen(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = createClient();
  await supabase.from("aufgabe").delete().eq("id", id);
  revalidatePath("/aufgaben");
  revalidatePath("/dashboard");
}
