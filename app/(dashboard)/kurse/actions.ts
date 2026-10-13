"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";

function leerZuNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

export interface KursState {
  error?: string;
  ok?: boolean;
}

export async function kursErstellen(_prev: KursState, formData: FormData): Promise<KursState> {
  const kontext = await getKontext();
  if (!kontext?.fahrschule) return { error: "Nicht angemeldet." };
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Bitte einen Kursnamen eingeben." };

  const supabase = createClient();
  const { error } = await supabase.from("kurs").insert({
    fahrschule_id: kontext.fahrschule.id,
    name,
    klasse: leerZuNull(formData.get("klasse")),
    beschreibung: leerZuNull(formData.get("beschreibung")),
    start_datum: leerZuNull(formData.get("start_datum")),
    status: String(formData.get("status") ?? "geplant"),
  });
  if (error) return { error: error.message };
  revalidatePath("/kurse");
  return { ok: true };
}

export async function kursStatusSetzen(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "geplant");
  if (!id) return;
  const supabase = createClient();
  await supabase.from("kurs").update({ status }).eq("id", id);
  revalidatePath("/kurse");
  revalidatePath(`/kurse/${id}`);
}

export async function kursLoeschen(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = createClient();
  await supabase.from("kurs").delete().eq("id", id);
  revalidatePath("/kurse");
  redirect("/kurse");
}

export async function teilnehmerHinzufuegen(formData: FormData): Promise<void> {
  const kontext = await getKontext();
  if (!kontext?.fahrschule) return;
  const kursId = String(formData.get("kurs_id") ?? "");
  const schuelerId = String(formData.get("schueler_id") ?? "");
  if (!kursId || !schuelerId) return;
  const supabase = createClient();
  await supabase
    .from("kurs_teilnahme")
    .upsert(
      { fahrschule_id: kontext.fahrschule.id, kurs_id: kursId, schueler_id: schuelerId },
      { onConflict: "kurs_id,schueler_id", ignoreDuplicates: true },
    );
  revalidatePath("/kurse", "layout");
}

export async function teilnehmerEntfernen(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const kursId = String(formData.get("kurs_id") ?? "");
  if (!id) return;
  const supabase = createClient();
  await supabase.from("kurs_teilnahme").delete().eq("id", id);
  revalidatePath(kursId ? `/kurse/${kursId}` : "/kurse");
  revalidatePath("/kurse");
}
