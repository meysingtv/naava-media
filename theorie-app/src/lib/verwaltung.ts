import AsyncStorage from "@react-native-async-storage/async-storage";

import { serverVerbunden, supabase } from "./supabase";

// Verwaltung (Manager im Web-Panel) und die Gegenstücke in der App:
// Meldungen prüfen, Fahrlehrer bestätigen, Einladungen, Lernstand, Prüfungs-
// termine und Mitteilungen. Alles über Datenbank-Funktionen, die nur der
// Inhaber aufrufen darf (supabase/update-verwaltung.sql, Abschnitt 29).
// Hinweise und Einladungen einlösen nutzt jeder angemeldete Nutzer.

function fehlerText(meldung: string): string {
  if (/could not find the function|function .* does not exist|schema cache/i.test(meldung)) return "Das SQL-Update für die Verwaltung fehlt noch (supabase/update-verwaltung.sql, Abschnitt 29).";
  if (/failed to fetch|network/i.test(meldung)) return "Server nicht erreichbar. Bitte prüfe die Verbindung.";
  return meldung;
}

async function rpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  if (!serverVerbunden) throw new Error("Die App ist noch mit keinem Server verbunden.");
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(fehlerText(error.message));
  return data as T;
}

// ---------------------------------------------------------------------------
// Zähler
// ---------------------------------------------------------------------------

export type Zaehler = { meldungen: number; fahrlehrer: number; bewerbungen: number; termine: number };

export async function adminZaehler(): Promise<Zaehler> {
  return rpc<Zaehler>("lern_admin_zaehler");
}

// ---------------------------------------------------------------------------
// Meldungen
// ---------------------------------------------------------------------------

export type MeldeGrund = { grund: string; von: string; am: string };

export type ClipMeldung = {
  id: string;
  titel: string;
  beschreibung: string;
  video_pfad: string;
  bild_pfad: string | null;
  autor: string;
  autor_name: string;
  autor_benutzer: string;
  erstellt_am: string;
  anzahl: number;
  gruende: MeldeGrund[];
  letzte: string;
};

export type ChatMeldung = {
  id: number;
  text: string;
  live: string;
  autor: string;
  autor_name: string;
  erstellt_am: string;
  anzahl: number;
  gruende: MeldeGrund[];
  letzte: string;
};

export type Entscheidung = {
  id: number;
  art: "clip" | "chat";
  inhalt: string;
  entscheidung: "entfernt" | "behalten";
  begruendung: string;
  meldungen: number;
  am: string;
  autor_name: string;
};

export type Meldungen = { clips: ClipMeldung[]; chat: ChatMeldung[]; erledigt: Entscheidung[] };

export async function meldungenLaden(): Promise<Meldungen> {
  const d = await rpc<Meldungen>("lern_admin_meldungen");
  return { clips: d?.clips ?? [], chat: d?.chat ?? [], erledigt: d?.erledigt ?? [] };
}

/** Entfernen (mit Begründung an den Verfasser) oder behalten. Bei Clips werden die Dateien mit gelöscht. */
export async function meldungEntscheiden(art: "clip" | "chat", id: string | number, entfernen: boolean, begruendung: string): Promise<void> {
  const d = await rpc<{ pfade?: string[] }>("lern_admin_meldung_entscheiden", { p_art: art, p_id: String(id), p_entfernen: entfernen, p_begruendung: begruendung });
  const pfade = d?.pfade ?? [];
  if (pfade.length) await supabase.storage.from("lern-clips").remove(pfade);
}

/** Öffentliche Adresse einer Datei aus dem Clip-Speicher (Vorschau in der Verwaltung). */
export function clipDateiUrl(pfad: string): string {
  return supabase.storage.from("lern-clips").getPublicUrl(pfad).data.publicUrl;
}

// ---------------------------------------------------------------------------
// Fahrlehrer bestätigen
// ---------------------------------------------------------------------------

export type Freigabe = { user_id: string; name: string; benutzername: string; email: string; status: "offen" | "bestaetigt" | "abgelehnt"; erstellt_am: string; entschieden_am: string | null };

export async function fahrlehrerFreigaben(): Promise<Freigabe[]> {
  return (await rpc<Freigabe[]>("lern_admin_fahrlehrer_freigaben")) ?? [];
}

/** `still`: ohne Nachricht an die Person (z. B. wenn der Inhaber selbst einen Fahrlehrer anlegt). */
export async function fahrlehrerEntscheiden(userId: string, bestaetigen: boolean, still = false): Promise<void> {
  await rpc("lern_admin_fahrlehrer_entscheiden", { p_user: userId, p_bestaetigen: bestaetigen, p_still: still });
}

// ---------------------------------------------------------------------------
// Einladungen
// ---------------------------------------------------------------------------

export type Einladung = { code: string; fahrlehrer_id: string | null; fahrlehrer: string; notiz: string; gueltig_bis: string | null; max_nutzungen: number | null; nutzungen: number; aktiv: boolean; erstellt_am: string };

export async function einladungErstellen(fahrlehrerId: string | null, tage: number | null, max: number | null, notiz: string): Promise<string> {
  return rpc<string>("lern_admin_einladung_erstellen", { p_fahrlehrer: fahrlehrerId, p_tage: tage, p_max: max, p_notiz: notiz });
}

export async function einladungenLaden(): Promise<Einladung[]> {
  return (await rpc<Einladung[]>("lern_admin_einladungen")) ?? [];
}

export async function einladungBeenden(code: string): Promise<void> {
  await rpc("lern_admin_einladung_beenden", { p_code: code });
}

/** Link, den der QR-Code enthält – öffnet die App auf der Einladungsseite. */
export function einladungLink(code: string): string {
  return `spur://einladung?code=${code}`;
}

/** Gilt der Code, und zu welchem Fahrlehrer gehört er? `null`, wenn er nicht gilt. */
export async function einladungInfo(code: string): Promise<{ fahrlehrer: string } | null> {
  const d = await rpc<{ gueltig: boolean; fahrlehrer: string }[]>("lern_einladung_info", { p_code: code });
  return d?.[0]?.gueltig ? { fahrlehrer: d[0].fahrlehrer } : null;
}

/** Einlösen (angemeldet). Liefert den Namen des Fahrlehrers (leer, wenn keiner gewählt war). */
export async function einladungEinloesen(code: string): Promise<string> {
  return (await rpc<string>("lern_einladung_einloesen", { p_code: code })) ?? "";
}

const EINLADUNG = "spur-einladung";

/** Code für später merken (z. B. QR gescannt, aber noch nicht registriert). */
export async function einladungMerken(code: string | null): Promise<void> {
  try {
    if (code) await AsyncStorage.setItem(EINLADUNG, code.trim().toUpperCase());
    else await AsyncStorage.removeItem(EINLADUNG);
  } catch {
    // Merken ist ein Zusatz
  }
}

export async function gemerkteEinladung(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(EINLADUNG);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Lernstand und Prüfungstermine
// ---------------------------------------------------------------------------

export type Lernstand = {
  /** r = richtig, f = falsch, t = zuletzt (ms), l = letzte Antwort richtig (1). */
  fragen?: Record<string, { r?: number; f?: number; t?: number; l?: 0 | 1; box?: number }>;
  pruefungen?: { datum?: string; bestanden?: boolean; fehlerpunkte?: number; richtig?: number; gesamt?: number }[];
  zeitTage?: Record<string, number>;
  antwortenTage?: Record<string, number>;
  schilder?: Record<string, string>;
  pruefungstermin?: string | null;
  serie?: number;
  letzterTag?: string | null;
  tagesziel?: number;
  aktualisiert_am?: string;
};

export async function lernstandLaden(userId: string): Promise<Lernstand> {
  return (await rpc<Lernstand>("lern_admin_lernstand", { p_user: userId })) ?? {};
}

export type Termin = { user_id: string; name: string; benutzername: string; klasse: string; termin: string; fahrlehrer_id: string | null; fahrlehrer: string };

export async function pruefungstermineLaden(): Promise<Termin[]> {
  return (await rpc<Termin[]>("lern_admin_pruefungstermine")) ?? [];
}

// ---------------------------------------------------------------------------
// Mitteilungen
// ---------------------------------------------------------------------------

export type MitteilungZiel = "alle" | "schueler" | "fahrlehrer" | "gruppe";
export type Mitteilung = { id: number; titel: string; text: string; ziel: MitteilungZiel; fahrlehrer: string; anzahl: number; erstellt_am: string };

/** Schickt die Mitteilung, liefert die Zahl der Empfänger. */
export async function mitteilungSenden(titel: string, text: string, ziel: MitteilungZiel, fahrlehrerId: string | null): Promise<number> {
  return rpc<number>("lern_admin_mitteilung_senden", { p_titel: titel, p_text: text, p_ziel: ziel, p_fahrlehrer: fahrlehrerId });
}

export async function mitteilungenLaden(): Promise<Mitteilung[]> {
  return (await rpc<Mitteilung[]>("lern_admin_mitteilungen")) ?? [];
}

// ---------------------------------------------------------------------------
// Hinweise an den Nutzer (App)
// ---------------------------------------------------------------------------

export type Hinweis = { id: number; art: string; titel: string; text: string; erstellt_am: string };

/** Ungelesene Hinweise; ohne SQL-Update einfach leer. */
export async function meineHinweise(): Promise<Hinweis[]> {
  if (!serverVerbunden) return [];
  const { data, error } = await supabase.rpc("lern_meine_hinweise");
  if (error) return [];
  return (data as Hinweis[]) ?? [];
}

export async function hinweisGelesen(id: number): Promise<void> {
  await supabase.rpc("lern_hinweis_gelesen", { p_id: id });
}
