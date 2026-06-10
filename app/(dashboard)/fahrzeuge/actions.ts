"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

/** Legt ein Fahrzeug an oder aktualisiert es (abhängig vom Feld `id`). */
export async function fahrzeugSpeichern(
  _prev: FahrzeugState,
  formData: FormData,
): Promise<FahrzeugState> {
  const kontext = await getKontext();
  if (!kontext?.fahrschule) {
    return { error: "Keine Fahrschule gefunden." };
  }

  const id = leerZuNull(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const kennzeichen = String(formData.get("kennzeichen") ?? "").trim();
  if (!name) return { error: "Bitte einen Namen angeben." };
  if (!kennzeichen) return { error: "Bitte ein Kennzeichen angeben." };

  const klassen = formData.getAll("klassen").map(String);
  const fahrlehrer_ids = formData.getAll("fahrlehrer_ids").map(String);

  const datensatz = {
    name,
    kennzeichen,
    fahrzeug_id_nr: leerZuNull(formData.get("fahrzeug_id_nr")),
    getriebeart: leerZuNull(formData.get("getriebeart")),
    klassen,
    klasse: klassen[0] ?? null,
    fahrlehrer_ids,
    anhaenger: formData.get("anhaenger") === "on",
    saison_von: leerZuNull(formData.get("saison_von")),
    saison_bis: leerZuNull(formData.get("saison_bis")),
    hauptuntersuchung: leerZuNull(formData.get("hauptuntersuchung")),
  };

  const supabase = createClient();
  let fahrzeugId = id;

  if (id) {
    const { error } = await supabase.from("fahrzeug").update(datensatz).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await supabase
      .from("fahrzeug")
      .insert({ ...datensatz, fahrschule_id: kontext.fahrschule.id })
      .select("id")
      .single();
    if (error || !data) {
      return { error: error?.message ?? "Das Fahrzeug konnte nicht angelegt werden." };
    }
    fahrzeugId = data.id;
  }

  revalidatePath("/fahrzeuge");
  redirect(`/fahrzeuge?id=${fahrzeugId}`);
}

/** Archiviert (aktiv=false) oder reaktiviert (aktiv=true) ein Fahrzeug. */
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
  redirect("/fahrzeuge");
}
