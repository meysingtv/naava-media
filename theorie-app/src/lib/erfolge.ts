import type { Ionicons } from "@expo/vector-icons";

import { FRAGEN, istZeichen } from "./fragen";
import type { Stand } from "./stand";

export type Erfolg = {
  id: string;
  titel: string;
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Automatisch prüfbar? Sonst schaltet ein Ereignis ihn frei (z. B. Training ohne Fehler). */
  pruefen?: (s: Stand) => boolean;
};

const summe = (s: Stand, feld: "r" | "f") => Object.values(s.fragen).reduce((n, f) => n + f[feld], 0);

export const ERFOLGE: Erfolg[] = [
  { id: "erster", titel: "Erster Kilometer", text: "Die erste Frage beantwortet.", icon: "flag", pruefen: (s) => summe(s, "r") + summe(s, "f") >= 1 },
  { id: "zehn", titel: "Warmgefahren", text: "10 Fragen richtig beantwortet.", icon: "flame", pruefen: (s) => summe(s, "r") >= 10 },
  { id: "fuenfzig", titel: "Auf Kurs", text: "50 Fragen richtig beantwortet.", icon: "navigate", pruefen: (s) => summe(s, "r") >= 50 },
  { id: "serie3", titel: "Drei am Stück", text: "An drei Tagen in Folge gelernt.", icon: "calendar", pruefen: (s) => s.besteSerie >= 3 },
  { id: "serie7", titel: "Wochenfahrer", text: "Eine Woche lang jeden Tag gelernt.", icon: "ribbon", pruefen: (s) => s.besteSerie >= 7 },
  { id: "ziel", titel: "Ziel erreicht", text: "Das Tagesziel geschafft.", icon: "speedometer", pruefen: (s) => Object.values(s.antwortenTage).some((n) => n >= s.tagesziel) },
  { id: "sauber", titel: "Saubere Runde", text: "Ein Training mit mindestens 10 Fragen ohne Fehler." , icon: "checkmark-done" },
  { id: "pruefung", titel: "Prüfungsreif", text: "Eine Prüfungssimulation bestanden.", icon: "school", pruefen: (s) => s.pruefungen.some((p) => p.bestanden) },
  { id: "duell", titel: "Erster Sieg", text: "Ein Duell gewonnen.", icon: "trophy", pruefen: (s) => s.duell.siege >= 1 },
  {
    id: "zeichen",
    titel: "Schilderkenner",
    text: "Alle Zeichenfragen sicher beantwortet.",
    icon: "eye",
    pruefen: (s) => FRAGEN.filter((f) => istZeichen(f.bild)).every((f) => (s.fragen[f.id]?.box ?? 0) >= 3),
  },
  {
    id: "rechnen",
    titel: "Rechenprofi",
    text: "Jede Zahlenfrage mindestens einmal richtig.",
    icon: "calculator",
    pruefen: (s) => FRAGEN.filter((f) => f.art === "zahl").every((f) => (s.fragen[f.id]?.r ?? 0) >= 1),
  },
  { id: "nacht", titel: "Nachtfahrt", text: "Nach 22 Uhr noch gelernt.", icon: "moon" },
];

export function erfolgVon(id: string): Erfolg | undefined {
  return ERFOLGE.find((e) => e.id === id);
}
