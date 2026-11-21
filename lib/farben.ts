/**
 * Akzentfarben der App – dieselbe Familie wie die Fahrstunden-Arten
 * (`FAHRSTUNDE_FARBE`). Für Kennzahl-Kacheln, Diagramme und Personen.
 */
export const AKZENT = {
  blau: "#3565E8",
  smaragd: "#0E9A77",
  violett: "#7650E0",
  orange: "#E38A1C",
  rot: "#E0434A",
  nacht: "#2F3F8F",
  schiefer: "#6B7383",
} as const;

/** Reihenfolge für Personen (Fahrlehrer, Team) – gut unterscheidbar nebeneinander. */
export const PERSONEN_FARBEN = [AKZENT.blau, AKZENT.smaragd, AKZENT.violett, AKZENT.orange, AKZENT.rot, AKZENT.nacht];
