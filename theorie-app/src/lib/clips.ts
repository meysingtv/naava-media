import type { ThemaId } from "./fragen";

export type ClipBildKey = "leuchten" | "rechts_vor_links" | "anhalteweg" | "rettungsgasse" | "kreisverkehr" | "abstand" | "schulbus" | "radfahrer";

export type Clip = {
  id: string;
  bild: ClipBildKey;
  kategorie: string;
  titel: string;
  punkte: string[];
  thema: ThemaId;
  /** Grundwert für „Gefällt mir“ (Übungswert, bis Clips online gezählt werden). */
  basis: number;
};

/** Kurz erklärt: je ein Thema, drei Sätze, eine bewegte Grafik. */
export const CLIPS: Clip[] = [
  {
    id: "c-leuchten",
    bild: "leuchten",
    kategorie: "Technik",
    titel: "Was dir die Lichter im Cockpit sagen",
    punkte: ["Rot: sofort sicher anhalten und den Motor abstellen.", "Gelb: vorsichtig weiter – bald in die Werkstatt.", "Blau oder Grün: nur ein Hinweis, zum Beispiel Fernlicht."],
    thema: "technik",
    basis: 412,
  },
  {
    id: "c-rechts",
    bild: "rechts_vor_links",
    kategorie: "Vorfahrt",
    titel: "Rechts vor links in fünf Sekunden",
    punkte: ["Gilt, wenn weder Zeichen noch Ampel etwas regeln.", "Wer von rechts kommt, fährt zuerst – auch wenn er abbiegt.", "Im Zweifel Blickkontakt suchen und lieber warten."],
    thema: "vorfahrt",
    basis: 689,
  },
  {
    id: "c-anhalteweg",
    bild: "anhalteweg",
    kategorie: "Formeln",
    titel: "Warum 50 km/h schon 40 Meter brauchen",
    punkte: ["Reaktionsweg: (50 ÷ 10) × 3 = 15 m.", "Bremsweg: (50 ÷ 10)² = 25 m.", "Zusammen 40 m – auf nasser Straße deutlich mehr."],
    thema: "zahlen",
    basis: 530,
  },
  {
    id: "c-rettungsgasse",
    bild: "rettungsgasse",
    kategorie: "Autobahn",
    titel: "Rettungsgasse: ganz links nach links, alle anderen nach rechts",
    punkte: ["Schon bei Schrittgeschwindigkeit bilden – nicht erst beim Martinshorn.", "Die Gasse liegt zwischen dem linken und dem Fahrstreifen daneben.", "Hinter Einsatzfahrzeugen herfahren ist verboten."],
    thema: "autobahn",
    basis: 947,
  },
  {
    id: "c-kreisverkehr",
    bild: "kreisverkehr",
    kategorie: "Vorfahrt",
    titel: "Kreisverkehr: Wann wird geblinkt?",
    punkte: ["Beim Hineinfahren nicht blinken.", "Beim Hinausfahren rechts blinken.", "Wer schon im Kreis fährt, hat Vorfahrt."],
    thema: "vorfahrt",
    basis: 574,
  },
  {
    id: "c-abstand",
    bild: "abstand",
    kategorie: "Tempo",
    titel: "Halber Tacho – der einfachste Abstand",
    punkte: ["Außerorts: halbe Geschwindigkeit in Metern.", "Bei 100 km/h also mindestens 50 m.", "Leitpfosten stehen alle 50 m – zähl einfach mit."],
    thema: "tempo",
    basis: 318,
  },
  {
    id: "c-schulbus",
    bild: "schulbus",
    kategorie: "Besondere Lagen",
    titel: "Schulbus mit Warnblinklicht",
    punkte: ["Nur mit Schrittgeschwindigkeit vorbeifahren.", "Das gilt auch für den Gegenverkehr.", "Kinder können plötzlich hinter dem Bus hervorlaufen."],
    thema: "autobahn",
    basis: 402,
  },
  {
    id: "c-radfahrer",
    bild: "radfahrer",
    kategorie: "Überholen",
    titel: "Radfahrer überholen: 1,5 m und 2 m",
    punkte: ["Innerorts mindestens 1,5 m Seitenabstand.", "Außerorts mindestens 2 m.", "Passt der Abstand nicht, bleibst du dahinter."],
    thema: "manoever",
    basis: 455,
  },
];
