"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import type { RolleRechte } from "@/lib/types";

export interface RolleState {
  error?: string;
}

function leerZuNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

/** Legt eine Benutzerrolle an oder aktualisiert sie (abhängig vom Feld `id`). */
export async function rolleSpeichern(_prev: RolleState, formData: FormData): Promise<RolleState> {
  const kontext = await getKontext();
  if (!kontext?.fahrschule) return { error: "Keine Fahrschule gefunden." };
  if (kontext.fahrlehrer?.rolle !== "chef") {
    return { error: "Nur der Geschäftsführer darf Rollen verwalten." };
  }

  const id = leerZuNull(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Bitte einen Rollennamen angeben." };

  const web_zugang = formData.get("web_zugang") !== "false";

  let rechte: RolleRechte = {};
  try {
    const roh = formData.get("rechte");
    if (roh) rechte = JSON.parse(String(roh)) as RolleRechte;
  } catch {
    rechte = {};
  }

  const datensatz = {
    name,
    beschreibung: leerZuNull(formData.get("beschreibung")),
    zugangsart: leerZuNull(formData.get("zugangsart")),
    web_zugang,
    rechte,
  };

  const supabase = createClient();
  let rolleId = id;

  if (id) {
    const { error } = await supabase.from("benutzerrolle").update(datensatz).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await supabase
      .from("benutzerrolle")
      .insert({ ...datensatz, fahrschule_id: kontext.fahrschule.id })
      .select("id")
      .single();
    if (error || !data) {
      return { error: error?.message ?? "Die Rolle konnte nicht angelegt werden." };
    }
    rolleId = data.id;
  }

  revalidatePath("/fahrlehrer/rollen");
  redirect(`/fahrlehrer/rollen?rolle=${rolleId}`);
}

export async function rolleLoeschen(formData: FormData): Promise<void> {
  const kontext = await getKontext();
  if (kontext?.fahrlehrer?.rolle !== "chef") return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  await supabase.from("benutzerrolle").delete().eq("id", id);

  revalidatePath("/fahrlehrer/rollen");
  redirect("/fahrlehrer/rollen");
}
