"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import type { RechnungStatus } from "@/lib/types";

export interface RechnungState {
  error?: string;
}

function leerZuNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

async function naechsteNummer(supabase: ReturnType<typeof createClient>): Promise<string> {
  const jahr = new Date().getFullYear();
  const { count } = await supabase
    .from("rechnung")
    .select("id", { count: "exact", head: true });
  const laufend = (count ?? 0) + 1;
  return `RE-${jahr}-${String(laufend).padStart(4, "0")}`;
}

export async function rechnungErstellen(
  _prev: RechnungState,
  formData: FormData,
): Promise<RechnungState> {
  const kontext = await getKontext();
  if (!kontext?.fahrschule) {
    redirect("/auth/login");
  }

  const supabase = createClient();

  const steuersatz = Number(formData.get("steuersatz") ?? 19);

  // Positionen aus parallelen Arrays zusammensetzen.
  const beschreibungen = formData.getAll("pos_beschreibung").map(String);
  const mengen = formData.getAll("pos_menge").map((v) => Number(v) || 0);
  const einheiten = formData.getAll("pos_einheit").map(String);
  const einzelpreise = formData.getAll("pos_einzelpreis").map((v) => Number(v) || 0);

  const positionen = beschreibungen
    .map((beschreibung, i) => ({
      beschreibung: beschreibung.trim(),
      menge: mengen[i] ?? 1,
      einheit: einheiten[i]?.trim() || "Stk",
      einzelpreis: einzelpreise[i] ?? 0,
    }))
    .filter((p) => p.beschreibung !== "");

  if (positionen.length === 0) {
    return { error: "Bitte mindestens eine Rechnungsposition mit Beschreibung angeben." };
  }

  const netto = positionen.reduce((s, p) => s + p.menge * p.einzelpreis, 0);
  const brutto = netto * (1 + steuersatz / 100);

  const nummerEingabe = leerZuNull(formData.get("nummer"));
  const nummer = nummerEingabe ?? (await naechsteNummer(supabase));

  const { data: rechnung, error } = await supabase
    .from("rechnung")
    .insert({
      fahrschule_id: kontext.fahrschule.id,
      schueler_id: leerZuNull(formData.get("schueler_id")),
      nummer,
      betrag_netto: Number(netto.toFixed(2)),
      steuersatz,
      betrag_brutto: Number(brutto.toFixed(2)),
      status: "offen",
      rechnungsdatum:
        leerZuNull(formData.get("rechnungsdatum")) ?? new Date().toISOString().slice(0, 10),
      faelligkeitsdatum: leerZuNull(formData.get("faelligkeitsdatum")),
      notiz: leerZuNull(formData.get("notiz")),
    })
    .select("id")
    .single();

  if (error || !rechnung) {
    return { error: error?.message ?? "Die Rechnung konnte nicht erstellt werden." };
  }

  const { error: posError } = await supabase
    .from("rechnung_position")
    .insert(positionen.map((p) => ({ ...p, rechnung_id: rechnung.id })));

  if (posError) {
    return { error: posError.message };
  }

  revalidatePath("/rechnungen");
  redirect(`/rechnungen/${rechnung.id}`);
}

export async function rechnungStatusSetzen(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "offen") as RechnungStatus;
  if (!id) return;

  const supabase = createClient();
  await supabase.from("rechnung").update({ status }).eq("id", id);
  revalidatePath("/rechnungen");
  revalidatePath(`/rechnungen/${id}`);
}

export async function rechnungLoeschen(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  await supabase.from("rechnung").delete().eq("id", id);
  revalidatePath("/rechnungen");
  redirect("/rechnungen");
}
