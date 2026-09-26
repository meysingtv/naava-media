import { Platform, type TextStyle } from "react-native";

// Design-Tokens von „Spur“: tiefes Schwarz als Grund, kräftiges Orange als
// Signalfarbe, Grün für richtig. Karten sind leicht angehoben und tragen eine
// feine helle Kante; Fotos bringen die Farbe in die Oberfläche.

export const farben = {
  // Werte direkt aus der Vorlage gemessen: bläuliches Schwarz, dunkle Karten
  grund: "#06090D",
  grundHoch: "#0A0E13",
  flaeche: "#10151A",
  flaeche2: "#1A1E24",
  flaeche3: "#353A42",
  option: "#18212A",
  linie: "rgba(255,255,255,0.08)",
  linieStark: "rgba(255,255,255,0.16)",

  text: "#FFFFFF",
  text2: "#D6D9DE",
  text3: "#959AA2",
  text4: "#62676F",

  orange: "#FC7400",
  orangeHell: "#FF9105",
  orangeTief: "#EC6600",
  orangeSoft: "rgba(252,116,0,0.15)",
  orangeLinie: "rgba(252,116,0,0.6)",
  orangeDunkel: "#2A1A0B",
  aufOrange: "#FFFFFF",

  blau: "#4DA3FF",
  blauSoft: "rgba(77,163,255,0.14)",
  gruen: "#62D149",
  gruenSoft: "rgba(98,209,73,0.15)",
  gruenDunkel: "#14231D",
  gruenOption: "#22351F",
  rot: "#FF5A4E",
  rotSoft: "rgba(255,90,78,0.14)",
  gelb: "#FFB400",
  gelbSoft: "rgba(255,180,0,0.14)",
  bernstein: "#FD9E02",
  krone: "#FFB81C",

  // Flächen einzelner Elemente wie in der Vorlage
  kreisFlamme: "#3A2313",
  kreisSaeulen: "#141A1F",
  kreisStern: "#3D2A10",
  iconKreis: "#202328",
  tipp: "#261A10",
  ringSpur: "#46484C",
  kachelWeiss: "#FFFBF5",

  // Verkehrszeichen und Lagepläne
  schildRot: "#C8102E",
  schildBlau: "#0058A3",
  schildGelb: "#F2C500",
  schildWeiss: "#FFFFFF",
  schildSchwarz: "#111111",
  asphalt: "#2B2E35",
  asphaltRand: "#3B3F48",
  gelaende: "#10141A",
} as const;

type Gewicht = "400" | "500" | "600" | "700" | "800";

const INTER: Record<Gewicht, string> = {
  "400": "Inter_400Regular",
  "500": "Inter_500Medium",
  "600": "Inter_600SemiBold",
  "700": "Inter_700Bold",
  "800": "Inter_800ExtraBold",
};

/** Auf dem iPhone die Systemschrift (San Francisco) wie in der Vorlage, sonst Inter. */
function schnitt(g: Gewicht): TextStyle {
  return Platform.OS === "ios" ? { fontFamily: "System", fontWeight: g } : { fontFamily: INTER[g] };
}

export const schrift = {
  titel: schnitt("800"),
  titelFett: schnitt("700"),
  titelHalb: schnitt("600"),
  text: schnitt("400"),
  textMittel: schnitt("500"),
  textHalb: schnitt("600"),
  textFett: schnitt("700"),
};

/** Schriften für SVG-Grafiken (brauchen einen festen Namen). */
export const svgSchrift = {
  text: "Inter_600SemiBold",
  fett: "Inter_700Bold",
  /** Schmale Schrift für Zahlen auf Verkehrszeichen und das Logo. */
  schild: "Archivo_800ExtraBold",
} as const;

export const radius = { s: 10, m: 14, l: 18, xl: 24, voll: 999 } as const;

export const abstand = (n: number) => n * 4;

/** Seitenrand links/rechts. */
export const RAND = 16;

/** Farbe für eine Erfolgsquote: grün ab 75 %, bernstein ab 60 %, sonst orange. */
export function quoteFarbe(anteil: number): string {
  if (anteil >= 0.75) return farben.gruen;
  if (anteil >= 0.6) return farben.bernstein;
  return farben.orange;
}
