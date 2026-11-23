import type { FahrstundeTyp } from "./types";

export const TYP_LABEL: Record<FahrstundeTyp, string> = {
  normal: "Übungsstunde",
  ueberland: "Überlandfahrt",
  autobahn: "Autobahnfahrt",
  nacht: "Nachtfahrt",
  pruefung: "Prüfung",
  theorie: "Theorie",
  sonstiges: "Termin",
};

/** Farbe je Art – dieselbe Familie wie in der Fahrlehrer-App. */
export const TYP_FARBE: Record<FahrstundeTyp, string> = {
  normal: "#0F766E",
  ueberland: "#15803D",
  autobahn: "#B45309",
  nacht: "#312E81",
  pruefung: "#9333EA",
  theorie: "#0369A1",
  sonstiges: "#475569",
};

export function typFarbe(typ: string): string {
  return TYP_FARBE[typ as FahrstundeTyp] ?? "#475569";
}

export function typLabel(typ: string): string {
  return TYP_LABEL[typ as FahrstundeTyp] ?? "Termin";
}

/** Pflicht-Sonderfahrten je Klasse – wie in der Web-App. */
const PFLICHT: Record<string, { ueberland: number; autobahn: number; nacht: number }> = {
  B: { ueberland: 5, autobahn: 4, nacht: 3 },
  BE: { ueberland: 0, autobahn: 0, nacht: 0 },
  A: { ueberland: 5, autobahn: 4, nacht: 3 },
  A1: { ueberland: 5, autobahn: 4, nacht: 3 },
  A2: { ueberland: 5, autobahn: 4, nacht: 3 },
};

export function pflichtFuer(klasse: string) {
  return PFLICHT[klasse] ?? { ueberland: 5, autobahn: 4, nacht: 3 };
}

/** Geplant und noch nicht vorbei (Ende liegt in der Zukunft). */
export function istAnstehend(s: { status: string; datum: string; uhrzeit: string; dauer_minuten: number }, jetzt = Date.now()): boolean {
  if (s.status !== "geplant") return false;
  const ende = new Date(`${s.datum}T${s.uhrzeit.slice(0, 5)}:00`).getTime() + s.dauer_minuten * 60_000;
  return ende > jetzt;
}
