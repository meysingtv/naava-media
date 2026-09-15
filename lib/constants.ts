import type { FahrlehrerRolle, FahrstundeStatus, FahrstundeTyp, RechnungStatus } from "@/lib/types";

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
  { key: "dashboard", label: "Dashboard", beschreibung: "Übersicht & Kennzahlen" },
  { key: "schueler", label: "Schüler", beschreibung: "Schülerverwaltung & Akten" },
  { key: "kalender", label: "Terminplaner", beschreibung: "Fahrstunden & Termine" },
  { key: "theorie", label: "Theorie", beschreibung: "Theorieunterricht" },
  { key: "rechnungen", label: "Rechnungen", beschreibung: "Rechnungen & Zahlungen" },
  { key: "fahrlehrer", label: "Benutzer", beschreibung: "Team & Rollen" },
  { key: "fahrzeuge", label: "Fahrzeuge", beschreibung: "Fahrzeugflotte" },
  { key: "einstellungen", label: "Einstellungen", beschreibung: "Fahrschul-Einstellungen" },
];

// Fahrstunden-Typen inkl. Farbkodierung für den Kalender
export interface TypMeta {
  label: string;
  kurz: string;
  badge: string; // Tailwind-Klassen für Badge/Block
  dot: string; // Tailwind-Klasse für Farbpunkt
}

// Kalender-Farben je Art: ruhige, aufeinander abgestimmte Töne. Türkis ist die
// normale Fahrstunde; die anderen Arten bleiben unterscheidbar, aber gedeckt.
export const FAHRSTUNDE_FARBE: Record<FahrstundeTyp, string> = {
  normal: "#0F9BA8",
  ueberland: "#16A34A",
  autobahn: "#2563EB",
  nacht: "#4F46E5",
  pruefung: "#DC2626",
  theorie: "#D97706",
  sonstiges: "#64748B",
};

export const FAHRSTUNDE_TYPEN: Record<FahrstundeTyp, TypMeta> = {
  normal: {
    label: "Normale Fahrstunde",
    kurz: "Normal",
    badge: "[&_i]:bg-primary",
    dot: "bg-primary",
  },
  ueberland: {
    label: "Überlandfahrt",
    kurz: "Überland",
    badge: "[&_i]:bg-success",
    dot: "bg-success",
  },
  autobahn: {
    label: "Autobahnfahrt",
    kurz: "Autobahn",
    badge: "[&_i]:bg-blue-600",
    dot: "bg-blue-600",
  },
  nacht: {
    label: "Nachtfahrt",
    kurz: "Nacht",
    badge: "[&_i]:bg-indigo-600",
    dot: "bg-indigo-600",
  },
  pruefung: {
    label: "Prüfung",
    kurz: "Prüfung",
    badge: "[&_i]:bg-destructive",
    dot: "bg-destructive",
  },
  theorie: {
    label: "Theoriestunde",
    kurz: "Theorie",
    badge: "[&_i]:bg-warning",
    dot: "bg-warning",
  },
  sonstiges: {
    label: "Sonstiges",
    kurz: "Sonstiges",
    badge: "[&_i]:bg-border-strong",
    dot: "bg-muted-foreground",
  },
};

export const FAHRSTUNDE_STATUS: Record<FahrstundeStatus, { label: string; badge: string }> = {
  geplant: { label: "Geplant", badge: "[&_i]:bg-primary" },
  abgeschlossen: { label: "Abgeschlossen", badge: "[&_i]:bg-success" },
  ausgefallen: { label: "Ausgefallen", badge: "[&_i]:bg-border-strong" },
};

export const RECHNUNG_STATUS: Record<RechnungStatus, { label: string; badge: string }> = {
  offen: { label: "Offen", badge: "[&_i]:bg-warning" },
  bezahlt: { label: "Bezahlt", badge: "[&_i]:bg-success" },
  ueberfaellig: { label: "Überfällig", badge: "[&_i]:bg-destructive" },
};

export const STEUERSAETZE = [19, 7, 0] as const;

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
