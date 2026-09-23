import { supabase } from "./supabase";
import {
  FAHRSTUNDE_SPALTEN,
  type Anfrage,
  type AnfrageRegeln,
  type Fahrstunde,
  type Lehrer,
  type Pruefung,
  type Rechnung,
  type RechnungPosition,
  type Schueler,
  type Schule,
} from "./types";

/**
 * Alle Abfragen der Schüler-App. Die Datenbank gibt einem Schüler nur seine
 * eigenen Zeilen (Row-Level-Security), Schreiben geht ausschließlich über
 * die freigegebenen Funktionen (Anfragen, Termin zusagen/absagen).
 */

type Ergebnis<T> = { data: T | null; error: { message: string } | null };

function verstaendlich(meldung: string): string {
  if (/could not find the function|does not exist|schema cache/i.test(meldung)) {
    return "Diese Funktion ist bei deiner Fahrschule noch nicht eingerichtet.";
  }
  if (/network request failed|fetch failed/i.test(meldung)) {
    return "Keine Verbindung. Bitte prüfe dein Internet.";
  }
  return meldung;
}

export async function ladeSchule(): Promise<Ergebnis<Schule>> {
  const { data, error } = await supabase.rpc("schueler_fahrschule");
  if (error) return { data: null, error };
  return { data: (Array.isArray(data) ? data[0] : null) ?? null, error: null };
}

export function ladeSchueler() {
  return supabase
    .from("fahrschueler")
    .select("id, vorname, nachname, email, fuehrerscheinklassen, theorie_bestanden, lernstatus, anmeldedatum")
    .maybeSingle<Schueler>();
}

export function ladeFahrstunden() {
  return supabase
    .from("fahrstunde")
    .select(FAHRSTUNDE_SPALTEN)
    .order("datum", { ascending: true })
    .order("uhrzeit", { ascending: true })
    .returns<Fahrstunde[]>();
}

/** Fahrlehrer der eigenen Fahrschule (nur Name) – ohne Datenbank-Update 0020 leer. */
export async function ladeLehrer(): Promise<Ergebnis<Lehrer[]>> {
  const { data, error } = await supabase.rpc("portal_fahrlehrer");
  return { data: error ? [] : ((data as Lehrer[] | null) ?? []), error: null };
}

/** Darf der Schüler anfragen? Ohne Datenbank-Update 0020: nein. */
export async function ladeRegeln(): Promise<Ergebnis<AnfrageRegeln>> {
  const { data, error } = await supabase.rpc("portal_anfragen_regeln");
  const r = !error && Array.isArray(data) ? data[0] : null;
  return {
    data: r
      ? {
          erlaubt: Boolean(r.erlaubt),
          vorlaufStunden: Number(r.vorlauf_stunden ?? 24),
          maxOffen: Number(r.max_offen ?? 3),
          offen: Number(r.offen ?? 0),
        }
      : { erlaubt: false, vorlaufStunden: 24, maxOffen: 3, offen: 0 },
    error: null,
  };
}

export async function ladeAnfragen(): Promise<Ergebnis<Anfrage[]>> {
  const { data, error } = await supabase
    .from("fahrstunde_anfrage")
    .select("id, wunsch_fahrlehrer_id, datum, uhrzeit, dauer_minuten, notiz, status, antwort, bearbeitet_am, created_at")
    .order("created_at", { ascending: false })
    .limit(40)
    .returns<Anfrage[]>();
  return { data: error ? [] : data ?? [], error: null };
}

export function ladeRechnungen() {
  return supabase
    .from("rechnung")
    .select("id, nummer, betrag_netto, steuersatz, betrag_brutto, status, rechnungsdatum, faelligkeitsdatum, bezahlt_am")
    .order("rechnungsdatum", { ascending: false })
    .returns<Rechnung[]>();
}

export async function ladeRechnung(id: string): Promise<Ergebnis<{ rechnung: Rechnung; positionen: RechnungPosition[] }>> {
  const [r, p] = await Promise.all([
    supabase
      .from("rechnung")
      .select("id, nummer, betrag_netto, steuersatz, betrag_brutto, status, rechnungsdatum, faelligkeitsdatum, bezahlt_am")
      .eq("id", id)
      .maybeSingle<Rechnung>(),
    supabase
      .from("rechnung_position")
      .select("id, beschreibung, menge, einheit, einzelpreis")
      .eq("rechnung_id", id)
      .returns<RechnungPosition[]>(),
  ]);
  if (r.error) return { data: null, error: r.error };
  if (!r.data) return { data: null, error: { message: "Rechnung nicht gefunden." } };
  return { data: { rechnung: r.data, positionen: p.data ?? [] }, error: null };
}

export function ladePruefungen() {
  return supabase
    .from("pruefung")
    .select("id, art, datum, uhrzeit, pruefstelle, ergebnis, versuch")
    .order("datum", { ascending: false })
    .returns<Pruefung[]>();
}

// ---- Schreiben (nur über freigegebene Datenbank-Funktionen) ---------------

export async function fahrstundeAnfragen(eingabe: {
  datum: string;
  uhrzeit: string;
  dauer: 45 | 90;
  fahrlehrerId: string | null;
  notiz: string;
}): Promise<string | null> {
  const { error } = await supabase.rpc("fahrstunde_anfragen", {
    p_datum: eingabe.datum,
    p_uhrzeit: eingabe.uhrzeit,
    p_dauer: eingabe.dauer,
    p_fahrlehrer: eingabe.fahrlehrerId,
    p_notiz: eingabe.notiz.trim().slice(0, 500),
  });
  return error ? verstaendlich(error.message) : null;
}

export async function anfrageZurueckziehen(id: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("fahrstunde_anfrage_zurueckziehen", { p_id: id });
  if (error) return verstaendlich(error.message);
  return data ? null : "Diese Anfrage wurde schon bearbeitet.";
}

export async function terminZusagen(token: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("termin_bestaetigen", { p_token: token });
  if (error) return verstaendlich(error.message);
  return data ? null : "Dieser Termin kann nicht mehr bestätigt werden.";
}

export async function terminAbsagen(token: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("termin_absagen", { p_token: token });
  if (error) return verstaendlich(error.message);
  return data ? null : "Dieser Termin ist bereits abgesagt.";
}
