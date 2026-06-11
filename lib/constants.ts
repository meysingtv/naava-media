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
  chef: "Chef",
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

export const FAHRSTUNDE_TYPEN: Record<FahrstundeTyp, TypMeta> = {
  normal: {
    label: "Normale Fahrstunde",
    kurz: "Normal",
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  ueberland: {
    label: "Überlandfahrt",
    kurz: "Überland",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  autobahn: {
    label: "Autobahnfahrt",
    kurz: "Autobahn",
    badge: "bg-cyan-100 text-cyan-700 border-cyan-200",
    dot: "bg-cyan-500",
  },
  nacht: {
    label: "Nachtfahrt",
    kurz: "Nacht",
    badge: "bg-indigo-100 text-indigo-700 border-indigo-200",
    dot: "bg-indigo-500",
  },
  pruefung: {
    label: "Prüfung",
    kurz: "Prüfung",
    badge: "bg-red-100 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
  theorie: {
    label: "Theoriestunde",
    kurz: "Theorie",
    badge: "bg-teal-100 text-teal-700 border-teal-200",
    dot: "bg-teal-500",
  },
  sonstiges: {
    label: "Sonstiges",
    kurz: "Sonstiges",
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    dot: "bg-slate-500",
  },
};

export const FAHRSTUNDE_STATUS: Record<FahrstundeStatus, { label: string; badge: string }> = {
  geplant: { label: "Geplant", badge: "bg-blue-100 text-blue-700 border-blue-200" },
  abgeschlossen: { label: "Abgeschlossen", badge: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  ausgefallen: { label: "Ausgefallen", badge: "bg-slate-100 text-slate-600 border-slate-200" },
};

export const RECHNUNG_STATUS: Record<RechnungStatus, { label: string; badge: string }> = {
  offen: { label: "Offen", badge: "bg-amber-100 text-amber-700 border-amber-200" },
  bezahlt: { label: "Bezahlt", badge: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  ueberfaellig: { label: "Überfällig", badge: "bg-red-100 text-red-700 border-red-200" },
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

// Farbpalette für Schüler-Avatare
export const AVATAR_FARBEN = [
  "#2563EB",
  "#16A34A",
  "#9333EA",
  "#DB2777",
  "#EA580C",
  "#0891B2",
  "#CA8A04",
  "#4F46E5",
  "#059669",
  "#DC2626",
];

export function zufallsAvatarFarbe(): string {
  return AVATAR_FARBEN[Math.floor(Math.random() * AVATAR_FARBEN.length)];
}
