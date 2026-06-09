// Datentypen – Spiegel des Supabase-Schemas (Teilmenge der Web-App).
export type FahrstundeTyp = "normal" | "autobahn" | "nacht" | "ueberland" | "pruefung";
export type FahrstundeStatus = "geplant" | "abgeschlossen" | "ausgefallen";
export type PinnwandTyp = "news" | "todo";

export type Pinnwand = {
  id: string;
  fahrschule_id: string;
  typ: PinnwandTyp;
  titel: string;
  inhalt: string | null;
  erledigt: boolean;
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
  created_at: string;
};

export type Fahrlehrer = {
  id: string;
  vorname: string;
  nachname: string;
};

export type Fahrzeug = {
  id: string;
  kennzeichen: string;
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
};

export type FahrstundeMitRelationen = Fahrstunde & {
  fahrschueler: Pick<Fahrschueler, "id" | "vorname" | "nachname" | "avatar_farbe"> | null;
  fahrlehrer: Pick<Fahrlehrer, "id" | "vorname" | "nachname"> | null;
  fahrzeug: Pick<Fahrzeug, "id" | "kennzeichen"> | null;
};

// Select-String für Fahrstunden inkl. Relationen (identisch zur Web-App).
export const FAHRSTUNDE_SELECT =
  "*, fahrschueler(id, vorname, nachname, avatar_farbe), fahrlehrer(id, vorname, nachname), fahrzeug(id, kennzeichen)";
