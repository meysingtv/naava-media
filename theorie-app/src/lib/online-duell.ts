import { FRAGEN } from "./fragen";
import { gemischt } from "./stand";
import { supabase } from "./supabase";

/**
 * Online-Duelle über den Server – asynchron: Wer eröffnet, spielt zuerst,
 * der Gegner dieselben Fragen später. Erst wenn beide fertig sind, gibt es
 * einen Sieger (und bei Rangliste-Duellen Elo-Punkte).
 */

export const ONLINE_FRAGEN = 10;
export const ONLINE_SEKUNDEN = 15;

export type OnlineDuell = {
  id: string;
  art: "rangliste" | "freund";
  code: string | null;
  fragen: string[];
  spieler1: string;
  spieler2: string | null;
  punkte1: number | null;
  zeit1: number | null;
  punkte2: number | null;
  zeit2: number | null;
  status: "wartet" | "laeuft" | "fertig";
  sieger: string | null;
  elo_aenderung: number | null;
  erstellt_am: string;
};

export type DuellMitNamen = OnlineDuell & {
  p1: { name: string; benutzername: string } | null;
  p2: { name: string; benutzername: string } | null;
};

function fehlerText(meldung: string): string {
  if (/Code ungültig/i.test(meldung)) return "Dieser Code ist ungültig oder wurde schon benutzt.";
  if (/could not find the function|does not exist|schema cache/i.test(meldung)) return "Online-Duelle sind auf dem Server noch nicht eingerichtet.";
  if (/network|fetch/i.test(meldung)) return "Keine Verbindung. Bitte prüfe dein Internet.";
  return meldung;
}

function zufallsFragen(): string[] {
  return gemischt(FRAGEN.filter((f) => f.art === "auswahl"))
    .slice(0, ONLINE_FRAGEN)
    .map((f) => f.id);
}

type Antwort<T> = { daten: T | null; fehler: string | null };

export async function rangDuellSuchen(): Promise<Antwort<OnlineDuell>> {
  const { data, error } = await supabase.rpc("lern_duell_rangliste", { p_fragen: zufallsFragen() });
  return error ? { daten: null, fehler: fehlerText(error.message) } : { daten: data as OnlineDuell, fehler: null };
}

export async function freundDuellErstellen(): Promise<Antwort<OnlineDuell>> {
  const { data, error } = await supabase.rpc("lern_duell_freund", { p_fragen: zufallsFragen() });
  return error ? { daten: null, fehler: fehlerText(error.message) } : { daten: data as OnlineDuell, fehler: null };
}

export async function freundDuellBeitreten(code: string): Promise<Antwort<OnlineDuell>> {
  const { data, error } = await supabase.rpc("lern_duell_beitreten", { p_code: code.trim().toUpperCase() });
  return error ? { daten: null, fehler: fehlerText(error.message) } : { daten: data as OnlineDuell, fehler: null };
}

export async function ergebnisMelden(id: string, punkte: number, zeit: number): Promise<Antwort<OnlineDuell>> {
  const { data, error } = await supabase.rpc("lern_duell_ergebnis", { p_id: id, p_punkte: punkte, p_zeit: zeit });
  return error ? { daten: null, fehler: fehlerText(error.message) } : { daten: data as OnlineDuell, fehler: null };
}

const MIT_NAMEN = "*, p1:lern_profil!lern_duell_spieler1_fkey(name, benutzername), p2:lern_profil!lern_duell_spieler2_fkey(name, benutzername)";

export async function duellLaden(id: string): Promise<DuellMitNamen | null> {
  const { data } = await supabase.from("lern_duell").select(MIT_NAMEN).eq("id", id).maybeSingle<DuellMitNamen>();
  return data ?? null;
}

export async function meineDuelle(): Promise<Antwort<DuellMitNamen[]>> {
  const { data, error } = await supabase.from("lern_duell").select(MIT_NAMEN).order("erstellt_am", { ascending: false }).limit(20).returns<DuellMitNamen[]>();
  return error ? { daten: null, fehler: fehlerText(error.message) } : { daten: data ?? [], fehler: null };
}

/** Sicht eines Spielers auf ein Duell: eigene und gegnerische Werte. */
export function sicht(d: DuellMitNamen | OnlineDuell, ich: string) {
  const bin1 = d.spieler1 === ich;
  const gegner = "p1" in d ? (bin1 ? d.p2 : d.p1) : null;
  return {
    meine: bin1 ? d.punkte1 : d.punkte2,
    meineZeit: bin1 ? d.zeit1 : d.zeit2,
    seine: bin1 ? d.punkte2 : d.punkte1,
    seineZeit: bin1 ? d.zeit2 : d.zeit1,
    gegnerName: gegner?.name || gegner?.benutzername || null,
    gewonnen: d.status === "fertig" && d.sieger === ich,
    verloren: d.status === "fertig" && d.sieger != null && d.sieger !== ich,
    elo: d.elo_aenderung == null ? null : bin1 ? d.elo_aenderung : -d.elo_aenderung,
    ichDran: (bin1 ? d.punkte1 : d.punkte2) == null && d.status !== "fertig",
  };
}
