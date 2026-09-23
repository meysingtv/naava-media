// =====================================================================
// TypeScript-Typen für alle Datenmodelle (Spiegel des Supabase-Schemas)
// =====================================================================
// Hinweis: Die Row-Typen sind bewusst als `type` (nicht `interface`)
// definiert. Nur Type-Aliase sind zu `Record<string, unknown>`
// zuweisbar – das benötigt der Supabase-Client, um Query-Ergebnisse
// korrekt zu typisieren.

export type FahrlehrerRolle = "chef" | "fahrlehrer" | "buero";
export type FahrstundeTyp = "normal" | "autobahn" | "nacht" | "ueberland" | "pruefung" | "theorie" | "sonstiges";
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
  // SEPA-Gläubigerdaten (Migration 0014) – für Lastschrift-Dateien
  bic: string | null;
  glaeubiger_id: string | null;
  kontoinhaber: string | null;
  // Optionaler Online-Zahlungslink (Migration 0017)
  zahlungslink: string | null;
  // Fahrstunden-Anfragen aus dem Portal (Migration 0020) – fehlen, solange sie nicht eingespielt ist
  anfragen_aktiv?: boolean;
  anfragen_vorlauf_stunden?: number;
  anfragen_max_offen?: number;
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
  // Erweiterte Stammdaten (Migration 0010)
  kuerzel: string | null;
  telefon_privat: string | null;
  strasse: string | null;
  plz: string | null;
  ort: string | null;
  geburtsdatum: string | null;
  geburtsort: string | null;
  notiz: string | null;
  // Eigene Rolle / Rollen-Profil (Migration 0012)
  benutzerrolle_id: string | null;
  // Lohnsätze (Migration 0018)
  stundenlohn: number | null;
  lohn_pro_fahrstunde: number | null;
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
  // Kundenakte v2 (Migration 0005)
  anrede: string | null;
  geburtsort: string | null;
  staatsangehoerigkeit: string | null;
  telefon_beruflich: string | null;
  schluesselzahl: string | null;
  erteilungsart: string | null;
  fuehrerscheinnummer: string | null;
  kurs: string | null;
  bf17: boolean;
  zahlungsart: string | null;
  kostentraeger_email: string | null;
  vorgangsnummer: string | null;
  pruefort: string | null;
  sehhilfe: boolean;
  ausbildung_beendet: boolean;
  telefon_privat: string | null;
  bisherige_klasse: string | null;
  ausgabedatum: string | null;
  zweiter_preis: boolean;
  autom_leistungspakete: boolean;
  // SEPA-Mandat (Migration 0014)
  sepa_mandat_ref: string | null;
  sepa_mandat_am: string | null;
  // Unterlagen-Checkliste + Ausbildungsvertrag (Migration 0015)
  sehtest_am: string | null;
  passbild_ok: boolean;
  erste_hilfe_am: string | null;
  antrag_gestellt_am: string | null;
  ausweis_ok: boolean;
  vertrag_unterschrift: string | null;
  vertrag_am: string | null;
  // Schüler-Portal (Migration 0016)
  user_id: string | null;
  portal_code: string | null;
  portal_aktiv: boolean;
  // Einzelner Schüler von Online-Anfragen ausgenommen (Migration 0020)
  anfragen_gesperrt?: boolean;
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
  // Erweiterte Stammdaten (Migration 0007)
  name: string | null;
  nummer: number | null;
  fahrzeug_id_nr: string | null;
  getriebeart: string | null;
  klassen: string[];
  fahrlehrer_ids: string[];
  anhaenger: boolean;
  saison_von: string | null;
  saison_bis: string | null;
  hauptuntersuchung: string | null;
  // Erweiterte Flotten-Daten (Migration 0014)
  hu_faellig: string | null;
  versicherung: string | null;
  km_stand: number | null;
  naechste_wartung: string | null;
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
  // Digitale Unterschrift des Schülers (Migration 0003) – Data-URL/SVG
  unterschrift: string | null;
  // Termin-Bestätigung / Erinnerung (Migration 0019)
  bestaetigung_token: string | null;
  bestaetigt_am: string | null;
  abgesagt_am: string | null;
  erinnerung_gesendet_am: string | null;
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
  // Mahnwesen + Zahlungsdatum (Migration 0014)
  mahnstufe: number;
  letzte_mahnung: string | null;
  bezahlt_am: string | null;
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
  // Optionale Kurs-Zuordnung (Migration 0018)
  kurs_id: string | null;
  created_at: string;
};

export type Kurs = {
  id: string;
  fahrschule_id: string;
  name: string;
  klasse: string | null;
  beschreibung: string | null;
  start_datum: string | null;
  status: string; // geplant | laufend | beendet
  created_at: string;
};

export type KursTeilnahme = {
  id: string;
  fahrschule_id: string;
  kurs_id: string;
  schueler_id: string;
  created_at: string;
};

export type Dokument = {
  id: string;
  fahrschule_id: string;
  schueler_id: string | null;
  name: string;
  kategorie: string | null;
  mime: string | null;
  groesse: number | null;
  datei: string;
  created_at: string;
};

export type Zahlung = {
  id: string;
  fahrschule_id: string;
  schueler_id: string | null;
  rechnung_id: string | null;
  betrag: number;
  datum: string;
  art: string; // bar | ueberweisung | lastschrift | karte
  notiz: string | null;
  created_at: string;
};

export type Rate = {
  id: string;
  fahrschule_id: string;
  schueler_id: string;
  betrag: number;
  faellig_am: string | null;
  bezahlt: boolean;
  notiz: string | null;
  created_at: string;
};

export type TheorieTeilnahme = {
  id: string;
  theoriestunde_id: string;
  schueler_id: string;
  anwesend: boolean;
};

export type Aufgabe = {
  id: string;
  fahrschule_id: string;
  titel: string;
  status: string; // offen | erledigt
  prioritaet: string; // niedrig | mittel | hoch
  faellig_am: string | null;
  schueler_id: string | null;
  created_at: string;
};

export type Leistung = {
  id: string;
  fahrschule_id: string;
  name: string;
  kategorie: string | null;
  preis: number;
  einheit: string;
  klasse: string | null;
  aktiv: boolean;
  sortierung: number;
  created_at: string;
};

export type PruefungArt = "theorie" | "praxis";
export type PruefungErgebnis = "offen" | "bestanden" | "nicht_bestanden";

export type Pruefung = {
  id: string;
  fahrschule_id: string;
  schueler_id: string | null;
  art: PruefungArt;
  klasse: string | null;
  datum: string;
  uhrzeit: string | null;
  pruefstelle: string | null;
  ergebnis: PruefungErgebnis;
  versuch: number;
  gebuehr: number | null;
  notiz: string | null;
  created_at: string;
};

export type KassenbuchEintrag = {
  id: string;
  fahrschule_id: string;
  datum: string;
  typ: "einnahme" | "ausgabe";
  betrag: number;
  kategorie: string | null;
  beschreibung: string | null;
  beleg: string | null;
  created_at: string;
};

export type Nachricht = {
  id: string;
  fahrschule_id: string;
  kanal: "email" | "sms" | "notiz";
  betreff: string | null;
  text: string;
  empfaenger: string | null;
  anzahl: number;
  status: "entwurf" | "gesendet";
  created_at: string;
};

export type RolleRecht = { ansehen?: boolean; bearbeiten?: boolean };
export type RolleRechte = {
  allgemein?: Record<string, boolean>;
  sidebar?: Record<string, RolleRecht>;
};

export type Benutzerrolle = {
  id: string;
  fahrschule_id: string;
  name: string;
  beschreibung: string | null;
  zugangsart: string | null;
  web_zugang: boolean;
  rechte: RolleRechte;
  created_at: string;
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
      aufgabe: { Row: TableRow<Aufgabe>; Insert: TableInsert<Aufgabe>; Update: TableUpdate<Aufgabe>; Relationships: [] };
      pruefung: { Row: TableRow<Pruefung>; Insert: TableInsert<Pruefung>; Update: TableUpdate<Pruefung>; Relationships: [] };
      kassenbuch_eintrag: { Row: TableRow<KassenbuchEintrag>; Insert: TableInsert<KassenbuchEintrag>; Update: TableUpdate<KassenbuchEintrag>; Relationships: [] };
      nachricht: { Row: TableRow<Nachricht>; Insert: TableInsert<Nachricht>; Update: TableUpdate<Nachricht>; Relationships: [] };
      leistung: { Row: TableRow<Leistung>; Insert: TableInsert<Leistung>; Update: TableUpdate<Leistung>; Relationships: [] };
      kurs: { Row: TableRow<Kurs>; Insert: TableInsert<Kurs>; Update: TableUpdate<Kurs>; Relationships: [] };
      kurs_teilnahme: { Row: TableRow<KursTeilnahme>; Insert: TableInsert<KursTeilnahme>; Update: TableUpdate<KursTeilnahme>; Relationships: [] };
      dokument: { Row: TableRow<Dokument>; Insert: TableInsert<Dokument>; Update: TableUpdate<Dokument>; Relationships: [] };
      zahlung: { Row: TableRow<Zahlung>; Insert: TableInsert<Zahlung>; Update: TableUpdate<Zahlung>; Relationships: [] };
      rate: { Row: TableRow<Rate>; Insert: TableInsert<Rate>; Update: TableUpdate<Rate>; Relationships: [] };
      benutzerrolle: { Row: TableRow<Benutzerrolle>; Insert: TableInsert<Benutzerrolle>; Update: TableUpdate<Benutzerrolle>; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: {
      current_fahrschule_id: { Args: Record<string, never>; Returns: string };
      current_rolle: { Args: Record<string, never>; Returns: FahrlehrerRolle };
      current_schueler_id: { Args: Record<string, never>; Returns: string };
      termin_by_token: {
        Args: { p_token: string };
        Returns: {
          datum: string;
          uhrzeit: string;
          dauer_minuten: number;
          typ: FahrstundeTyp;
          status: FahrstundeStatus;
          bestaetigt: boolean;
          abgesagt: boolean;
          fahrschule_name: string;
          schueler_vorname: string | null;
        }[];
      };
      termin_bestaetigen: { Args: { p_token: string }; Returns: boolean };
      termin_absagen: { Args: { p_token: string }; Returns: boolean };
      schueler_portal_verknuepfen: { Args: { p_code: string }; Returns: string };
      schueler_fahrschule: {
        Args: Record<string, never>;
        Returns: {
          name: string;
          ort: string | null;
          logo_url: string | null;
          iban: string | null;
          kontoinhaber: string | null;
          zahlungslink: string | null;
        }[];
      };
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
      set_aktive_fahrschule: { Args: { p_id: string }; Returns: undefined };
      meine_fahrschulen: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          name: string;
          ort: string | null;
          logo_url: string | null;
          rolle: FahrlehrerRolle;
        }[];
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

// Eine Fahrschule, zu der der angemeldete Nutzer gehört (für den Umschalter).
export type FahrschulMitgliedschaft = {
  id: string;
  name: string;
  ort: string | null;
  logo_url: string | null;
  rolle: FahrlehrerRolle;
};

// Fahrstunden-Anfrage aus dem Schüler-Portal (Migration 0020)
export type AnfrageStatus = "offen" | "angenommen" | "abgelehnt" | "zurueckgezogen";

export type FahrstundeAnfrage = {
  id: string;
  fahrschule_id: string;
  schueler_id: string;
  wunsch_fahrlehrer_id: string | null;
  datum: string;
  uhrzeit: string;
  dauer_minuten: number;
  notiz: string | null;
  status: AnfrageStatus;
  antwort: string | null;
  fahrstunde_id: string | null;
  bearbeitet_von: string | null;
  bearbeitet_am: string | null;
  created_at: string;
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

export type PruefungMitSchueler = Pruefung & {
  fahrschueler: Pick<Fahrschueler, "id" | "vorname" | "nachname" | "avatar_farbe"> | null;
};
