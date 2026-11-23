"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";

function leerZuNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

export interface PruefungState {
  error?: string;
  ok?: boolean;
}

export async function pruefungErstellen(
  _prev: PruefungState,
  formData: FormData,
): Promise<PruefungState> {
  const kontext = await getKontext();
  if (!kontext?.fahrschule) return { error: "Nicht angemeldet." };

  const datum = leerZuNull(formData.get("datum"));
  if (!datum) return { error: "Bitte ein Datum angeben." };

  const supabase = createClient();
  const gebuehr = leerZuNull(formData.get("gebuehr"));
  const { error } = await supabase.from("pruefung").insert({
    fahrschule_id: kontext.fahrschule.id,
    schueler_id: leerZuNull(formData.get("schueler_id")),
    art: String(formData.get("art") ?? "theorie"),
    klasse: leerZuNull(formData.get("klasse")),
    datum,
    uhrzeit: leerZuNull(formData.get("uhrzeit")),
    pruefstelle: leerZuNull(formData.get("pruefstelle")),
    versuch: Number(formData.get("versuch") ?? 1) || 1,
    gebuehr: gebuehr ? Number(gebuehr) : null,
    notiz: leerZuNull(formData.get("notiz")),
    ergebnis: "offen",
  });
  if (error) return { error: error.message };

  revalidatePath("/pruefungen");
  return { ok: true };
}

export async function pruefungErgebnisSetzen(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const ergebnis = String(formData.get("ergebnis") ?? "offen");
  if (!id) return;

  const supabase = createClient();
  await supabase.from("pruefung").update({ ergebnis }).eq("id", id);

  // Bei bestandener Theorieprüfung den Schüler-Status mitziehen (Komfort).
  const schuelerId = leerZuNull(formData.get("schueler_id"));
  const art = String(formData.get("art") ?? "");
  if (schuelerId && art === "theorie" && ergebnis === "bestanden") {
    await supabase.from("fahrschueler").update({ theorie_bestanden: true }).eq("id", schuelerId);
  }
  if (schuelerId && art === "praxis" && ergebnis === "bestanden") {
    await supabase.from("fahrschueler").update({ ausbildung_beendet: true }).eq("id", schuelerId);
  }

  revalidatePath("/pruefungen");
}

export async function pruefungLoeschen(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = createClient();
  await supabase.from("pruefung").delete().eq("id", id);
  revalidatePath("/pruefungen");
}
