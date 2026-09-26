import { Platform, type TextStyle } from "react-native";

// Design-Tokens von „Spur“: tiefes Schwarz als Grund, kräftiges Orange als
// Signalfarbe, Grün für richtig. Karten sind leicht angehoben und tragen eine
// feine helle Kante; Fotos bringen die Farbe in die Oberfläche.

export const farben = {
  grund: "#0B0C0F",
  grundHoch: "#111316",
  flaeche: "#16181C",
  flaeche2: "#1D2025",
  flaeche3: "#2A2D33",
  linie: "rgba(255,255,255,0.08)",
  linieStark: "rgba(255,255,255,0.15)",

  text: "#F5F6F7",
  text2: "#C9CCD1",
  text3: "#8E939B",
  text4: "#5E636B",

  orange: "#FF7A00",
  orangeHell: "#FF9632",
  orangeTief: "#E86200",
  orangeSoft: "rgba(255,122,0,0.14)",
  orangeLinie: "rgba(255,122,0,0.55)",
  orangeDunkel: "#2E1A08",
  aufOrange: "#FFFFFF",

  blau: "#4DA3FF",
  blauSoft: "rgba(77,163,255,0.14)",
  gruen: "#5DD14A",
  gruenSoft: "rgba(93,209,74,0.14)",
  gruenDunkel: "#16261A",
  rot: "#FF5A4E",
  rotSoft: "rgba(255,90,78,0.14)",
  gelb: "#FFB21E",
  gelbSoft: "rgba(255,178,30,0.14)",
  bernstein: "#FFA41B",

  // Verkehrszeichen und Lagepläne
  schildRot: "#C8102E",
  schildBlau: "#0058A3",
  schildGelb: "#F2C500",
  schildWeiss: "#FFFFFF",
  schildSchwarz: "#111111",
  asphalt: "#2B2E35",
  asphaltRand: "#3B3F48",
  gelaende: "#121418",
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
