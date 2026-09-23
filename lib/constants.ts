import type { FahrlehrerRolle, FahrstundeStatus, FahrstundeTyp, RechnungStatus } from "@/lib/types";

/**
 * Badge-Variante je Status (Designsystem v3). `badge` und `dot` bleiben
 * erhalten – Kalender und Punkte nutzen sie weiter.
 */
export type BadgeVariante =
  | "default"
  | "success"
  | "warning"
  | "destructive"
  | "info"
  | "secondary"
  | "outline"
  | "solid"
  | "neutral";

// Gängige Führerscheinklassen in Deutschland
export const FUEHRERSCHEINKLASSEN = [
  "AM",
  "A1",
  "A2",
  "A",
  "B",
  "B96",
  "BE",
  "B197",
  "C1",
  "C1E",
  "C",
  "CE",
  "D1",
  "D1E",
  "D",
  "DE",
  "L",
  "T",
] as const;

// Pflicht-Sonderfahrten je Klasse (gesetzliche Mindestanzahl).
// Für die meisten Klassen gilt: 5 Überland, 4 Autobahn, 3 Nacht/Dämmerung.
export interface PflichtFahrten {
  ueberland: number;
  autobahn: number;
  nacht: number;
}

export const PFLICHTFAHRTEN_DEFAULT: PflichtFahrten = {
  ueberland: 5,
  autobahn: 4,
  nacht: 3,
};

export const PFLICHTFAHRTEN_JE_KLASSE: Record<string, PflichtFahrten> = {
  B: { ueberland: 5, autobahn: 4, nacht: 3 },
  BE: { ueberland: 0, autobahn: 0, nacht: 0 },
  A: { ueberland: 5, autobahn: 4, nacht: 3 },
  A1: { ueberland: 5, autobahn: 4, nacht: 3 },
  A2: { ueberland: 5, autobahn: 4, nacht: 3 },
};

export function pflichtFahrtenFuer(klasse: string): PflichtFahrten {
  return PFLICHTFAHRTEN_JE_KLASSE[klasse] ?? PFLICHTFAHRTEN_DEFAULT;
}

// Rollen
export const ROLLEN: Record<FahrlehrerRolle, string> = {
  chef: "Geschäftsführer",
  fahrlehrer: "Fahrlehrer",
  buero: "Büro",
};

export const ROLLEN_BESCHREIBUNG: Record<FahrlehrerRolle, string> = {
  chef: "Voller Zugriff auf alle Bereiche",
  fahrlehrer: "Eigener Kalender und Schüler",
  buero: "Rechnungen und Schüler (keine Löhne)",
};

// ---------------------------------------------------------------------
// Rollen-Berechtigungen (für die Rollenverwaltung)
// ---------------------------------------------------------------------
// Navigationsbereiche, für die je Rolle "ansehen"/"bearbeiten" gesetzt
// werden kann. Schlüssel entsprechen den Sidebar-Bereichen der App.
export interface SidebarBereich {
  key: string;
  label: string;
  beschreibung: string;
}

export const SIDEBAR_BEREICHE: SidebarBereich[] = [
  { key: "dashboard", label: "Dashboard", beschreibung: "Übersicht und Kennzahlen" },
  { key: "schueler", label: "Schüler", beschreibung: "Schülerakten und Ausbildungsstand" },
  { key: "kalender", label: "Kalender", beschreibung: "Fahrstunden und Termine" },
  { key: "theorie", label: "Ausbildung", beschreibung: "Theorie, Kurse und Prüfungen" },
  { key: "rechnungen", label: "Finanzen", beschreibung: "Rechnungen und Zahlungen" },
  { key: "fahrlehrer", label: "Team", beschreibung: "Mitarbeiter und Rollen" },
  { key: "fahrzeuge", label: "Fahrzeuge", beschreibung: "Fahrzeuge und Fristen" },
  { key: "einstellungen", label: "Einstellungen", beschreibung: "Profil der Fahrschule und Preisliste" },
];

// Fahrstunden-Typen inkl. Farbkodierung für den Kalender
export interface TypMeta {
  label: string;
  kurz: string;
  badge: string; // Tailwind-Klassen für Badge/Block
  dot: string; // Tailwind-Klasse für Farbpunkt
  variant: BadgeVariante; // v3: Badge-Variante statt Klassen-Override
}

// Farben je Fahrstunden-Art – sieben klar unterscheidbare, gleich kräftige
// Töne. Sie tragen Kalender, Tagesplan und Auswertungen; weiße Schrift auf
// jeder Farbe erreicht mindestens 3:1 (große/fette Schrift in Blöcken).
export const FAHRSTUNDE_FARBE: Record<FahrstundeTyp, string> = {
  normal: "#3565E8", // Blau
  ueberland: "#0E9A77", // Smaragd
  autobahn: "#7650E0", // Violett
  nacht: "#2F3F8F", // Nachtblau
  pruefung: "#E0434A", // Rot
  theorie: "#E38A1C", // Orange
  sonstiges: "#6B7383", // Schiefer
};

export const FAHRSTUNDE_TYPEN: Record<FahrstundeTyp, TypMeta> = {
  normal: {
    label: "Normale Fahrstunde",
    kurz: "Normal",
    badge: "[&_i]:bg-[#3565E8]",
    dot: "bg-[#3565E8]",
    variant: "default",
  },
  ueberland: {
    label: "Überlandfahrt",
    kurz: "Überland",
    badge: "[&_i]:bg-[#0E9A77]",
    dot: "bg-[#0E9A77]",
    variant: "success",
  },
  autobahn: {
    label: "Autobahnfahrt",
    kurz: "Autobahn",
    badge: "[&_i]:bg-[#7650E0]",
    dot: "bg-[#7650E0]",
    variant: "info",
  },
  nacht: {
    label: "Nachtfahrt",
    kurz: "Nacht",
    badge: "[&_i]:bg-[#2F3F8F]",
    dot: "bg-[#2F3F8F]",
    variant: "default",
  },
  pruefung: {
    label: "Prüfung",
    kurz: "Prüfung",
    badge: "[&_i]:bg-[#E0434A]",
    dot: "bg-[#E0434A]",
    variant: "destructive",
  },
  theorie: {
    label: "Theoriestunde",
    kurz: "Theorie",
    badge: "[&_i]:bg-[#E38A1C]",
    dot: "bg-[#E38A1C]",
    variant: "warning",
  },
  sonstiges: {
    label: "Sonstiges",
    kurz: "Sonstiges",
    badge: "[&_i]:bg-[#6B7383]",
    dot: "bg-[#6B7383]",
    variant: "secondary",
  },
};

export const FAHRSTUNDE_STATUS: Record<FahrstundeStatus, { label: string; badge: string; variant: BadgeVariante }> = {
  geplant: { label: "Geplant", badge: "[&_i]:bg-primary", variant: "default" },
  abgeschlossen: { label: "Abgeschlossen", badge: "[&_i]:bg-success", variant: "success" },
  ausgefallen: { label: "Ausgefallen", badge: "[&_i]:bg-border-strong", variant: "secondary" },
};

export const RECHNUNG_STATUS: Record<RechnungStatus, { label: string; badge: string; variant: BadgeVariante }> = {
  offen: { label: "Offen", badge: "[&_i]:bg-warning", variant: "warning" },
  bezahlt: { label: "Bezahlt", badge: "[&_i]:bg-success", variant: "success" },
  ueberfaellig: { label: "Überfällig", badge: "[&_i]:bg-destructive", variant: "destructive" },
};

export const STEUERSAETZE = [19, 7, 0] as const;

/** Status eines Theoriekurses mit Farbe des Status-Punkts. */
export const KURS_STATUS: Record<string, { label: string; ton: "primary" | "warning" | "neutral" }> = {
  laufend: { label: "Läuft", ton: "primary" },
  geplant: { label: "Geplant", ton: "warning" },
  beendet: { label: "Beendet", ton: "neutral" },
};

/** Zahlarten für Zahlungseingänge. */
export const ZAHLARTEN: Record<string, string> = {
  ueberweisung: "Überweisung",
  bar: "Bar",
  lastschrift: "Lastschrift",
  karte: "Karte",
};

// ---------------------------------------------------------------------
// Theorieunterricht
// ---------------------------------------------------------------------
// Themen-Vorschläge für eine Theoriestunde (Grundstoff 1–12 +
// klassenspezifischer Zusatzstoff). Dienen nur als Auswahlhilfe.
export const THEORIE_THEMEN = [
  "Grundstoff 1",
  "Grundstoff 2",
  "Grundstoff 3",
  "Grundstoff 4",
  "Grundstoff 5",
  "Grundstoff 6",
  "Grundstoff 7",
  "Grundstoff 8",
  "Grundstoff 9",
  "Grundstoff 10",
  "Grundstoff 11",
  "Grundstoff 12",
  "Zusatzstoff Klasse B (1)",
  "Zusatzstoff Klasse B (2)",
  "Zusatzstoff Klasse A",
] as const;

// Pflicht-Theorieeinheiten (Doppelstunden): 12 Grundstoff + Zusatzstoff je Klasse.
export const THEORIE_GRUNDSTOFF = 12;

export const THEORIE_ZUSATZSTOFF_JE_KLASSE: Record<string, number> = {
  B: 2,
  B197: 2,
  BE: 0,
  A: 4,
  A1: 4,
  A2: 4,
  AM: 2,
};

export function theoriePflichtFuer(klasse: string): number {
  return THEORIE_GRUNDSTOFF + (THEORIE_ZUSATZSTOFF_JE_KLASSE[klasse] ?? 2);
}

// Farbpalette für Schüler-Avatare (gedeckte Töne, werden weich getönt dargestellt)
export const AVATAR_FARBEN = [
  "#0C8CA1",
  "#2563EB",
  "#16A34A",
  "#7C3AED",
  "#DB2777",
  "#EA580C",
  "#CA8A04",
  "#4F46E5",
  "#0F766E",
  "#DC2626",
];

export function zufallsAvatarFarbe(): string {
  return AVATAR_FARBEN[Math.floor(Math.random() * AVATAR_FARBEN.length)];
}

/** Getriebeart für die Anzeige – versteht „MANUAL"/„AUTOMATIK" und Klartext. */
export function getriebeLabel(wert: string | null | undefined): string {
  if (!wert) return "—";
  return /auto/i.test(wert) ? "Automatik" : "Schaltung";
}

/** Gespeicherter Wert der Getriebeart („MANUAL" oder „AUTOMATIK"). */
export function getriebeWert(wert: string | null | undefined): "MANUAL" | "AUTOMATIK" {
  return wert && /auto/i.test(wert) ? "AUTOMATIK" : "MANUAL";
}
