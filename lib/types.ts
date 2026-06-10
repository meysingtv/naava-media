// =====================================================================
// TypeScript-Typen für alle Datenmodelle (Spiegel des Supabase-Schemas)
// =====================================================================
// Hinweis: Die Row-Typen sind bewusst als `type` (nicht `interface`)
// definiert. Nur Type-Aliase sind zu `Record<string, unknown>`
// zuweisbar – das benötigt der Supabase-Client, um Query-Ergebnisse
// korrekt zu typisieren.

export type FahrlehrerRolle = "chef" | "fahrlehrer" | "buero";
export type FahrstundeTyp = "normal" | "autobahn" | "nacht" | "ueberland" | "pruefung";
export type FahrstundeStatus = "geplant" | "abgeschlossen" | "ausgefallen";
export type RechnungStatus = "offen" | "bezahlt" | "ueberfaellig";

export type Fahrschule = {
  id: string;
  name: string;
  strasse: string | null;
  plz: string | null;
  ort: string | null;
  telefon: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  iban: string | null;
  steuernummer: string | null;
  created_at: string;
};

export type Fahrlehrer = {
  id: string;
  fahrschule_id: string;
  user_id: string | null;
  vorname: string;
  nachname: string;
  email: string | null;
  telefon: string | null;
  fuehrerscheinklassen: string[];
  rolle: FahrlehrerRolle;
  aktiv: boolean;
  created_at: string;
};

export type Fahrschueler = {
  id: string;
  fahrschule_id: string;
  vorname: string;
  nachname: string;
  geburtsdatum: string | null;
  strasse: string | null;
  plz: string | null;
  ort: string | null;
  telefon: string | null;
  email: string | null;
  fuehrerscheinklassen: string[];
  anmeldedatum: string;
  theorie_bestanden: boolean;
  theorie_termin: string | null;
  pruefung_termin: string | null;
  notizen: string | null;
  avatar_farbe: string;
  // Kundenakte / Verwaltung (Migration 0004)
  kundennummer: number | null;
  kostentraeger: string | null;
  filiale: string | null;
  prueforganisation: string | null;
  preisliste: string | null;
  intensivkurs: boolean;
  iban: string | null;
  theorie_versuch: number;
  praxis_versuch: number;
  lernstatus: number;
  created_at: string;
};

export type SchuelerFortschritt = {
  id: string;
  schueler_id: string;
  klasse: string;
  fahrstunden_gesamt: number;
  fahrstunden_bezahlt: number;
  normalfahrten: number;
  autobahnfahrten: number;
  nachtfahrten: number;
  ueberlandfahrten: number;
  pruefungsreif: boolean;
};

export type Fahrzeug = {
  id: string;
  fahrschule_id: string;
  kennzeichen: string;
  marke: string | null;
  modell: string | null;
  klasse: string | null;
  aktiv: boolean;
  created_at: string;
};

export type Fahrstunde = {
  id: string;
  fahrschule_id: string;
  schueler_id: string | null;
  fahrlehrer_id: string | null;
  fahrzeug_id: string | null;
  datum: string;
  uhrzeit: string;
  dauer_minuten: number;
  typ: FahrstundeTyp;
  status: FahrstundeStatus;
  notiz: string | null;
  created_at: string;
};

export type Rechnung = {
  id: string;
  fahrschule_id: string;
  schueler_id: string | null;
  nummer: string;
  betrag_netto: number;
  steuersatz: number;
  betrag_brutto: number;
  status: RechnungStatus;
  rechnungsdatum: string;
  faelligkeitsdatum: string | null;
  notiz: string | null;
  created_at: string;
};

export type RechnungPosition = {
  id: string;
  rechnung_id: string;
  beschreibung: string;
  menge: number;
  einheit: string | null;
  einzelpreis: number;
};

export type Theoriestunde = {
  id: string;
  fahrschule_id: string;
  datum: string;
  uhrzeit: string;
  thema: string | null;
  max_teilnehmer: number | null;
  created_at: string;
};

export type TheorieTeilnahme = {
  id: string;
  theoriestunde_id: string;
  schueler_id: string;
  anwesend: boolean;
};

// ---------------------------------------------------------------------
// Insert/Update lassen alle Felder optional, da viele Spalten DB-Defaults
// haben (id, created_at, aktiv, status, …). Die NOT-NULL-Pflicht erzwingt
// die Datenbank zur Laufzeit; die Feld-Typen werden weiterhin geprüft.
// ---------------------------------------------------------------------
type TableRow<T> = T;
type TableInsert<T> = Partial<T>;
type TableUpdate<T> = Partial<T>;

// ---------------------------------------------------------------------
// Database-Typ für den typisierten Supabase-Client
// ---------------------------------------------------------------------
export type Database = {
  public: {
    Tables: {
      fahrschule: { Row: TableRow<Fahrschule>; Insert: TableInsert<Fahrschule>; Update: TableUpdate<Fahrschule>; Relationships: [] };
      fahrlehrer: { Row: TableRow<Fahrlehrer>; Insert: TableInsert<Fahrlehrer>; Update: TableUpdate<Fahrlehrer>; Relationships: [] };
      fahrschueler: { Row: TableRow<Fahrschueler>; Insert: TableInsert<Fahrschueler>; Update: TableUpdate<Fahrschueler>; Relationships: [] };
      schueler_fortschritt: { Row: TableRow<SchuelerFortschritt>; Insert: TableInsert<SchuelerFortschritt>; Update: TableUpdate<SchuelerFortschritt>; Relationships: [] };
      fahrzeug: { Row: TableRow<Fahrzeug>; Insert: TableInsert<Fahrzeug>; Update: TableUpdate<Fahrzeug>; Relationships: [] };
      fahrstunde: { Row: TableRow<Fahrstunde>; Insert: TableInsert<Fahrstunde>; Update: TableUpdate<Fahrstunde>; Relationships: [] };
      rechnung: { Row: TableRow<Rechnung>; Insert: TableInsert<Rechnung>; Update: TableUpdate<Rechnung>; Relationships: [] };
      rechnung_position: { Row: TableRow<RechnungPosition>; Insert: TableInsert<RechnungPosition>; Update: TableUpdate<RechnungPosition>; Relationships: [] };
      theoriestunde: { Row: TableRow<Theoriestunde>; Insert: TableInsert<Theoriestunde>; Update: TableUpdate<Theoriestunde>; Relationships: [] };
      theorie_teilnahme: { Row: TableRow<TheorieTeilnahme>; Insert: TableInsert<TheorieTeilnahme>; Update: TableUpdate<TheorieTeilnahme>; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: {
      current_fahrschule_id: { Args: Record<string, never>; Returns: string };
      current_rolle: { Args: Record<string, never>; Returns: FahrlehrerRolle };
      setup_fahrschule: {
        Args: {
          p_name: string;
          p_vorname: string;
          p_nachname: string;
          p_strasse?: string | null;
          p_plz?: string | null;
          p_ort?: string | null;
          p_telefon?: string | null;
          p_email?: string | null;
        };
        Returns: string;
      };
    };
    Enums: {
      fahrlehrer_rolle: FahrlehrerRolle;
      fahrstunde_typ: FahrstundeTyp;
      fahrstunde_status: FahrstundeStatus;
      rechnung_status: RechnungStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};

// ---------------------------------------------------------------------
// Erweiterte Typen mit Relationen (für Join-Abfragen)
// ---------------------------------------------------------------------
export type FahrstundeMitRelationen = Fahrstunde & {
  fahrschueler: Pick<Fahrschueler, "id" | "vorname" | "nachname" | "avatar_farbe"> | null;
  fahrlehrer: Pick<Fahrlehrer, "id" | "vorname" | "nachname"> | null;
  fahrzeug: Pick<Fahrzeug, "id" | "kennzeichen"> | null;
};

export type RechnungMitSchueler = Rechnung & {
  fahrschueler: Pick<Fahrschueler, "id" | "vorname" | "nachname"> | null;
};
