"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";

export interface AufgabeState {
  error?: string;
  ok?: boolean;
}

export async function aufgabeErstellen(
  _prev: AufgabeState,
  formData: FormData,
): Promise<AufgabeState> {
  const kontext = await getKontext();
  if (!kontext?.fahrschule) return { error: "Keine Fahrschule gefunden." };

  const titel = String(formData.get("titel") ?? "").trim();
  if (!titel) return { error: "Bitte einen Titel angeben." };

  const faellig = String(formData.get("faellig_am") ?? "").trim() || null;
  const prioritaet = String(formData.get("prioritaet") ?? "mittel");
  const schueler = String(formData.get("schueler_id") ?? "").trim() || null;

  const supabase = createClient();
  const { error } = await supabase.from("aufgabe").insert({
    fahrschule_id: kontext.fahrschule.id,
    titel,
    faellig_am: faellig,
    prioritaet,
    schueler_id: schueler,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function aufgabeStatusSetzen(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "offen");
  if (!id) return;

  const supabase = createClient();
  await supabase.from("aufgabe").update({ status }).eq("id", id);
  revalidatePath("/dashboard");
}

export async function aufgabeLoeschen(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  await supabase.from("aufgabe").delete().eq("id", id);
  revalidatePath("/dashboard");
}
