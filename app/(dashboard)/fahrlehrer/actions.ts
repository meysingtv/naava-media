"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import type { FahrlehrerRolle } from "@/lib/types";

export interface FahrlehrerState {
  error?: string;
  ok?: boolean;
}

function leerZuNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

/** Legt einen Mitarbeiter (Fahrlehrer/Büro) im Team an. */
export async function fahrlehrerAnlegen(
  _prev: FahrlehrerState,
  formData: FormData,
): Promise<FahrlehrerState> {
  const kontext = await getKontext();
  if (!kontext?.fahrschule) {
    return { error: "Keine Fahrschule gefunden." };
  }
  if (kontext.fahrlehrer?.rolle !== "chef") {
    return { error: "Nur der Chef darf Mitarbeiter anlegen." };
  }

  const vorname = String(formData.get("vorname") ?? "").trim();
  const nachname = String(formData.get("nachname") ?? "").trim();
  if (!vorname || !nachname) {
    return { error: "Bitte Vor- und Nachname angeben." };
  }

  const rolle = (String(formData.get("rolle") ?? "fahrlehrer") as FahrlehrerRolle) || "fahrlehrer";
  const klassen = formData.getAll("klassen").map(String);

  const supabase = createClient();
  const { error } = await supabase.from("fahrlehrer").insert({
    fahrschule_id: kontext.fahrschule.id,
    user_id: null,
    vorname,
    nachname,
    email: leerZuNull(formData.get("email")),
    telefon: leerZuNull(formData.get("telefon")),
    fuehrerscheinklassen: klassen,
    rolle,
    aktiv: true,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/fahrlehrer");
  return { ok: true };
}

export async function fahrlehrerAktivSetzen(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const aktiv = formData.get("aktiv") === "true";
  if (!id) return;

  const supabase = createClient();
  await supabase.from("fahrlehrer").update({ aktiv }).eq("id", id);
  revalidatePath("/fahrlehrer");
}

export async function fahrlehrerRolleSetzen(id: string, rolle: FahrlehrerRolle): Promise<void> {
  if (!id) return;
  const supabase = createClient();
  await supabase.from("fahrlehrer").update({ rolle }).eq("id", id);
  revalidatePath("/fahrlehrer");
}

export async function fahrlehrerLoeschen(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  await supabase.from("fahrlehrer").delete().eq("id", id);
  revalidatePath("/fahrlehrer");
}
