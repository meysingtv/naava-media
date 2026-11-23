"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import { dbFehlerText } from "@/lib/db-fehler";

export interface EinstellungenState {
  error?: string;
  message?: string;
}

function leerZuNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

/** Aktualisiert das Firmenprofil der Fahrschule (nur Chef – per RLS abgesichert). */
export async function fahrschuleAktualisieren(
  _prev: EinstellungenState,
  formData: FormData,
): Promise<EinstellungenState> {
  const kontext = await getKontext();
  if (!kontext?.fahrschule) {
    return { error: "Keine Fahrschule gefunden." };
  }
  if (kontext.fahrlehrer?.rolle !== "chef") {
    return { error: "Nur der Geschäftsführer darf die Einstellungen ändern." };
  }

  // Nur Felder speichern, die das Formular mitschickt – die Einstellungen
  // sind auf mehrere Seiten verteilt.
  const FELDER = [
    "strasse",
    "plz",
    "ort",
    "logo_url",
    "telefon",
    "email",
    "website",
    "iban",
    "steuernummer",
    "kontoinhaber",
    "bic",
    "glaeubiger_id",
    "zahlungslink",
  ] as const;
  const aenderung: Record<string, string | null> = {};
  if (formData.has("name")) {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return { error: "Der Name der Fahrschule darf nicht leer sein." };
    aenderung.name = name;
  }
  for (const feld of FELDER) if (formData.has(feld)) aenderung[feld] = leerZuNull(formData.get(feld));
  if (Object.keys(aenderung).length === 0) return { message: "Nichts zu speichern." };

  const supabase = createClient();
  const { error } = await supabase.from("fahrschule").update(aenderung).eq("id", kontext.fahrschule.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/einstellungen");
  revalidatePath("/", "layout");
  return { message: "Änderungen wurden gespeichert." };
}


/** Online-Anfragen im Portal: Hauptschalter und Regeln (nur Chef). */
export async function anfragenEinstellungenSpeichern(eingabe: {
  aktiv: boolean;
  vorlaufStunden: number;
  maxOffen: number;
}): Promise<EinstellungenState> {
  const kontext = await getKontext();
  if (!kontext?.fahrschule) return { error: "Keine Fahrschule gefunden." };
  if (kontext.fahrlehrer?.rolle !== "chef") return { error: "Nur der Geschäftsführer darf das ändern." };

  const vorlauf = Math.round(eingabe.vorlaufStunden);
  const maxOffen = Math.round(eingabe.maxOffen);
  if (!Number.isFinite(vorlauf) || vorlauf < 0 || vorlauf > 336) return { error: "Vorlauf: 0 bis 336 Stunden." };
  if (!Number.isFinite(maxOffen) || maxOffen < 1 || maxOffen > 20) return { error: "Offene Anfragen: 1 bis 20." };

  const { error } = await createClient()
    .from("fahrschule")
    .update({ anfragen_aktiv: eingabe.aktiv, anfragen_vorlauf_stunden: vorlauf, anfragen_max_offen: maxOffen })
    .eq("id", kontext.fahrschule.id);
  if (error) {
    return { error: dbFehlerText(error.message) };
  }

  revalidatePath("/einstellungen");
  return { message: eingabe.aktiv ? "Online-Anfragen sind eingeschaltet." : "Online-Anfragen sind ausgeschaltet." };
}

/** Einzelne Schüler von Online-Anfragen ausnehmen oder wieder freigeben (nur Chef). */
export async function schuelerAnfragenSetzen(ids: string[], gesperrt: boolean): Promise<EinstellungenState> {
  const kontext = await getKontext();
  if (!kontext?.fahrschule) return { error: "Keine Fahrschule gefunden." };
  if (kontext.fahrlehrer?.rolle !== "chef") return { error: "Nur der Geschäftsführer darf das ändern." };
  if (ids.length === 0) return {};

  const { error } = await createClient().from("fahrschueler").update({ anfragen_gesperrt: gesperrt }).in("id", ids);
  if (error) {
    return { error: dbFehlerText(error.message) };
  }

  revalidatePath("/einstellungen");
  return { message: gesperrt ? "Gesperrt." : "Freigegeben." };
}
