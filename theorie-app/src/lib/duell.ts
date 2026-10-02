export type Gegner = {
  id: string;
  name: string;
  titel: string;
  /** Wahrscheinlichkeit einer richtigen Antwort. */
  quote: number;
  rating: number;
  farbe: string;
  /** Antwortzeit in Sekunden (von – bis). */
  tempo: [number, number];
};

export const GEGNER: Gegner[] = [
  { id: "mia", name: "Mia", titel: "Gerade gestartet", quote: 0.55, rating: 900, farbe: "#64ACFF", tempo: [6, 14] },
  { id: "jonas", name: "Jonas", titel: "Halbe Strecke geschafft", quote: 0.72, rating: 1100, farbe: "#38D39F", tempo: [4, 11] },
  { id: "lea", name: "Lea", titel: "Prüfung in einer Woche", quote: 0.88, rating: 1300, farbe: "#FFC857", tempo: [3, 8] },
];

export function gegnerVon(id?: string): Gegner {
  return GEGNER.find((g) => g.id === id) ?? GEGNER[0];
}

export const DUELL_RUNDEN = 5;
export const DUELL_SEKUNDEN = 20;
