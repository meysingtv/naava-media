"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import { zufallsAvatarFarbe } from "@/lib/constants";

export interface SchuelerFormState {
  error?: string;
}

function leerZuNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

/** Legt einen Schüler an oder aktualisiert ihn (abhängig vom Feld `id`). */
export async function schuelerSpeichern(
  _prev: SchuelerFormState,
  formData: FormData,
): Promise<SchuelerFormState> {
  const kontext = await getKontext();
  if (!kontext?.fahrschule) {
    redirect("/auth/login");
  }

  const supabase = createClient();

  const id = leerZuNull(formData.get("id"));
  const vorname = String(formData.get("vorname") ?? "").trim();
  const nachname = String(formData.get("nachname") ?? "").trim();

  if (!vorname || !nachname) {
    return { error: "Vor- und Nachname sind Pflichtfelder." };
  }

  const klassen = formData.getAll("klassen").map(String);

  const datensatz = {
    vorname,
    nachname,
    geburtsdatum: leerZuNull(formData.get("geburtsdatum")),
    strasse: leerZuNull(formData.get("strasse")),
    plz: leerZuNull(formData.get("plz")),
    ort: leerZuNull(formData.get("ort")),
    telefon: leerZuNull(formData.get("telefon")),
    email: leerZuNull(formData.get("email")),
    fuehrerscheinklassen: klassen,
    theorie_bestanden: formData.get("theorie_bestanden") === "on",
    theorie_termin: leerZuNull(formData.get("theorie_termin")),
    pruefung_termin: leerZuNull(formData.get("pruefung_termin")),
    notizen: leerZuNull(formData.get("notizen")),
  };

  let schuelerId = id;

  if (id) {
    const { error } = await supabase.from("fahrschueler").update(datensatz).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const anmeldedatum =
      leerZuNull(formData.get("anmeldedatum")) ?? new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("fahrschueler")
      .insert({
        ...datensatz,
        fahrschule_id: kontext.fahrschule.id,
        anmeldedatum,
        avatar_farbe: leerZuNull(formData.get("avatar_farbe")) ?? zufallsAvatarFarbe(),
      })
      .select("id")
      .single();
    if (error || !data) {
      return { error: error?.message ?? "Der Schüler konnte nicht angelegt werden." };
    }
    schuelerId = data.id;
  }

  // Für jede (neue) Klasse einen Fortschritts-Datensatz sicherstellen.
  if (schuelerId && klassen.length > 0) {
    const rows = klassen.map((klasse) => ({ schueler_id: schuelerId as string, klasse }));
    await supabase
      .from("schueler_fortschritt")
      .upsert(rows, { onConflict: "schueler_id,klasse", ignoreDuplicates: true });
  }

  revalidatePath("/schueler");
  if (schuelerId) revalidatePath(`/schueler/${schuelerId}`);
  redirect(`/schueler/${schuelerId}`);
}

/** Löscht einen Schüler vollständig (DSGVO – inkl. abhängiger Datensätze per Cascade). */
export async function schuelerLoeschen(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/schueler");

  const supabase = createClient();
  await supabase.from("fahrschueler").delete().eq("id", id);

  revalidatePath("/schueler");
  redirect("/schueler");
}
