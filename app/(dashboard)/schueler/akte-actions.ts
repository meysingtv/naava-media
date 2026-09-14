"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";

function leerZuNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

// --- Dokumente -------------------------------------------------------
export async function dokumentHochladen(input: {
  schuelerId: string;
  name: string;
  kategorie?: string;
  mime: string;
  groesse: number;
  datei: string;
}): Promise<{ ok?: boolean; error?: string }> {
  const kontext = await getKontext();
  if (!kontext?.fahrschule) return { error: "Nicht angemeldet." };
  if (!input.name || !input.datei) return { error: "Ungültige Datei." };
  if (input.datei.length > 2_200_000) return { error: "Datei zu groß (max. ~1,5 MB)." };

  const supabase = createClient();
  const { error } = await supabase.from("dokument").insert({
    fahrschule_id: kontext.fahrschule.id,
    schueler_id: input.schuelerId,
    name: input.name,
    kategorie: input.kategorie ?? null,
    mime: input.mime,
    groesse: input.groesse,
    datei: input.datei,
  });
  if (error) return { error: error.message };
  revalidatePath(`/schueler/${input.schuelerId}`);
  revalidatePath("/schueler");
  return { ok: true };
}

export async function dokumentLoeschen(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = createClient();
  await supabase.from("dokument").delete().eq("id", id);
  revalidatePath("/schueler");
}

// --- Ratenzahlung ----------------------------------------------------
export interface RatenState {
  error?: string;
  ok?: boolean;
}

export async function ratenplanErstellen(_prev: RatenState, formData: FormData): Promise<RatenState> {
  const kontext = await getKontext();
  if (!kontext?.fahrschule) return { error: "Nicht angemeldet." };
  const schuelerId = String(formData.get("schueler_id") ?? "");
  if (!schuelerId) return { error: "Kein Schüler." };

  const gesamt = Number(formData.get("gesamt") ?? 0);
  const anzahl = Math.max(1, Math.min(36, Number(formData.get("anzahl") ?? 1)));
  if (!gesamt || gesamt <= 0) return { error: "Bitte einen Gesamtbetrag eingeben." };

  const start = leerZuNull(formData.get("start")) ?? new Date().toISOString().slice(0, 10);
  const rate = Math.round((gesamt / anzahl) * 100) / 100;
  const [y, m, d] = start.split("-").map(Number);

  const rows = Array.from({ length: anzahl }, (_, i) => {
    const faellig = new Date(y, m - 1 + i, d).toISOString().slice(0, 10);
    // Rundungsdifferenz auf die letzte Rate legen
    const betrag = i === anzahl - 1 ? Math.round((gesamt - rate * (anzahl - 1)) * 100) / 100 : rate;
    return {
      fahrschule_id: kontext.fahrschule!.id,
      schueler_id: schuelerId,
      betrag,
      faellig_am: faellig,
      bezahlt: false,
      notiz: `Rate ${i + 1}/${anzahl}`,
    };
  });

  const supabase = createClient();
  const { error } = await supabase.from("rate").insert(rows);
  if (error) return { error: error.message };
  revalidatePath(`/schueler/${schuelerId}`);
  revalidatePath("/schueler");
  return { ok: true };
}

export async function rateBezahltSetzen(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const bezahlt = formData.get("bezahlt") === "true";
  if (!id) return;
  const supabase = createClient();
  await supabase.from("rate").update({ bezahlt }).eq("id", id);
  revalidatePath("/schueler");
}

export async function rateLoeschen(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = createClient();
  await supabase.from("rate").delete().eq("id", id);
  revalidatePath("/schueler");
}
