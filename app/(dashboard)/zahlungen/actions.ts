"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";

function leerZuNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

export interface ZahlungState {
  error?: string;
  ok?: boolean;
}

export async function zahlungErfassen(_prev: ZahlungState, formData: FormData): Promise<ZahlungState> {
  const kontext = await getKontext();
  if (!kontext?.fahrschule) return { error: "Nicht angemeldet." };

  const betrag = Number(formData.get("betrag") ?? 0);
  if (!betrag || betrag <= 0) return { error: "Bitte einen Betrag größer 0 eingeben." };

  const supabase = createClient();
  const rechnungId = leerZuNull(formData.get("rechnung_id"));
  const datum = leerZuNull(formData.get("datum")) ?? new Date().toISOString().slice(0, 10);

  const { error } = await supabase.from("zahlung").insert({
    fahrschule_id: kontext.fahrschule.id,
    schueler_id: leerZuNull(formData.get("schueler_id")),
    rechnung_id: rechnungId,
    betrag: Number(betrag.toFixed(2)),
    datum,
    art: String(formData.get("art") ?? "ueberweisung"),
    notiz: leerZuNull(formData.get("notiz")),
  });
  if (error) return { error: error.message };

  // Zahlungsabgleich: verknüpfte Rechnung als bezahlt markieren.
  if (rechnungId) {
    await supabase
      .from("rechnung")
      .update({ status: "bezahlt", bezahlt_am: datum, mahnstufe: 0 })
      .eq("id", rechnungId);
  }

  revalidatePath("/zahlungen");
  revalidatePath("/rechnungen");
  revalidatePath("/buchhaltung");
  return { ok: true };
}

export async function zahlungLoeschen(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = createClient();
  await supabase.from("zahlung").delete().eq("id", id);
  revalidatePath("/zahlungen");
}
