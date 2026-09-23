// Datentypen der Schüler-App – nur, was ein Schüler über seine Freigaben lesen darf.
export type FahrstundeTyp = "normal" | "autobahn" | "nacht" | "ueberland" | "pruefung" | "theorie" | "sonstiges";
export type FahrstundeStatus = "geplant" | "abgeschlossen" | "ausgefallen";

export type Schueler = {
  id: string;
  vorname: string;
  nachname: string;
  email: string | null;
  fuehrerscheinklassen: string[] | null;
  theorie_bestanden: boolean;
  lernstatus: number | null;
  anmeldedatum: string;
};

export type Schule = {
  name: string;
  ort: string | null;
  logo_url: string | null;
  iban: string | null;
  kontoinhaber: string | null;
  zahlungslink: string | null;
};

export type Fahrstunde = {
  id: string;
  fahrlehrer_id: string | null;
  datum: string;
  uhrzeit: string;
  dauer_minuten: number;
  typ: FahrstundeTyp;
  status: FahrstundeStatus;
  bestaetigung_token: string | null;
  bestaetigt_am: string | null;
  abgesagt_am: string | null;
};

export const FAHRSTUNDE_SPALTEN =
  "id, fahrlehrer_id, datum, uhrzeit, dauer_minuten, typ, status, bestaetigung_token, bestaetigt_am, abgesagt_am";

export type AnfrageStatus = "offen" | "angenommen" | "abgelehnt" | "zurueckgezogen";

export type Anfrage = {
  id: string;
  wunsch_fahrlehrer_id: string | null;
  datum: string;
  uhrzeit: string;
  dauer_minuten: number;
  notiz: string | null;
  status: AnfrageStatus;
  antwort: string | null;
  bearbeitet_am: string | null;
  created_at: string;
};

export type AnfrageRegeln = { erlaubt: boolean; vorlaufStunden: number; maxOffen: number; offen: number };

export type Lehrer = { id: string; name: string };

export type Rechnung = {
  id: string;
  nummer: string;
  betrag_netto: number;
  steuersatz: number;
  betrag_brutto: number;
  status: "offen" | "bezahlt" | "ueberfaellig";
  rechnungsdatum: string;
  faelligkeitsdatum: string | null;
  bezahlt_am: string | null;
};

export type RechnungPosition = {
  id: string;
  beschreibung: string;
  menge: number;
  einheit: string | null;
  einzelpreis: number;
};

export type Pruefung = {
  id: string;
  art: "theorie" | "praxis";
  datum: string;
  uhrzeit: string | null;
  pruefstelle: string | null;
  ergebnis: "offen" | "bestanden" | "nicht_bestanden";
  versuch: number;
};
