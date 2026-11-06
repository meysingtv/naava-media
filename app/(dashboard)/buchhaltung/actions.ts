"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";

function leerZuNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

export interface KassenState {
  error?: string;
  ok?: boolean;
}

export async function kassenEintragErstellen(
  _prev: KassenState,
  formData: FormData,
): Promise<KassenState> {
  const kontext = await getKontext();
  if (!kontext?.fahrschule) return { error: "Nicht angemeldet." };

  const betrag = Number(formData.get("betrag") ?? 0);
  if (!betrag || betrag <= 0) return { error: "Bitte einen Betrag größer 0 eingeben." };

  const supabase = createClient();
  const { error } = await supabase.from("kassenbuch_eintrag").insert({
    fahrschule_id: kontext.fahrschule.id,
    datum: leerZuNull(formData.get("datum")) ?? new Date().toISOString().slice(0, 10),
    typ: String(formData.get("typ") ?? "einnahme"),
    betrag: Number(betrag.toFixed(2)),
    kategorie: leerZuNull(formData.get("kategorie")),
    beschreibung: leerZuNull(formData.get("beschreibung")),
    beleg: leerZuNull(formData.get("beleg")),
  });
  if (error) return { error: error.message };

  revalidatePath("/buchhaltung");
  return { ok: true };
}

export async function kassenEintragLoeschen(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = createClient();
  await supabase.from("kassenbuch_eintrag").delete().eq("id", id);
  revalidatePath("/buchhaltung");
}
