import type { FahrstundeStatus, FahrstundeTyp } from "./types";

type Farbe = { bg: string; text: string };

export const TYP_LABEL: Record<FahrstundeTyp, string> = {
  normal: "Normal",
  ueberland: "Überland",
  autobahn: "Autobahn",
  nacht: "Nacht",
  pruefung: "Prüfung",
};

export const TYP_FARBE: Record<FahrstundeTyp, Farbe> = {
  normal: { bg: "#DBEAFE", text: "#1D4ED8" },
  ueberland: { bg: "#D1FAE5", text: "#047857" },
  autobahn: { bg: "#FEF3C7", text: "#B45309" },
  nacht: { bg: "#E0E7FF", text: "#4338CA" },
  pruefung: { bg: "#FEE2E2", text: "#B91C1C" },
};

export const STATUS_LABEL: Record<FahrstundeStatus, string> = {
  geplant: "Geplant",
  abgeschlossen: "Abgeschlossen",
  ausgefallen: "Ausgefallen",
};

export const STATUS_FARBE: Record<FahrstundeStatus, Farbe> = {
  geplant: { bg: "#DBEAFE", text: "#1D4ED8" },
  abgeschlossen: { bg: "#D1FAE5", text: "#047857" },
  ausgefallen: { bg: "#F1F5F9", text: "#475569" },
};

// Gesetzliche Pflicht-Sonderfahrten (Klasse B) – Soll-Anzahl je Typ.
export const PFLICHTFAHRTEN: { typ: FahrstundeTyp; label: string; soll: number }[] = [
  { typ: "ueberland", label: "Überlandfahrten", soll: 5 },
  { typ: "autobahn", label: "Autobahnfahrten", soll: 4 },
  { typ: "nacht", label: "Nachtfahrten", soll: 3 },
];
