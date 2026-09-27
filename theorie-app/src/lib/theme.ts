import { Platform, type TextStyle } from "react-native";

// Design-Tokens von „Spur“: tiefes Schwarz als Grund, kräftiges Orange als
// Signalfarbe, Grün für richtig. Karten sind leicht angehoben und tragen eine
// feine helle Kante; Fotos bringen die Farbe in die Oberfläche.

export const farben = {
  // Werte aus der Vorlage gemessen: fast schwarzer Grund, sehr dunkle Karten
  grund: "#030507",
  grundHoch: "#07090C",
  flaeche: "#0D1317",
  flaeche2: "#131A21",
  flaeche3: "#2B3138",
  option: "#111A20",
  linie: "rgba(255,255,255,0.08)",
  linieStark: "rgba(255,255,255,0.14)",

  text: "#FFFFFF",
  text2: "#D3D7DC",
  text3: "#8F959D",
  text4: "#5C626A",

  orange: "#FA6A1C",
  orangeHell: "#FF8A2B",
  orangeTief: "#F4501A",
  orangeSoft: "rgba(250,106,28,0.15)",
  orangeLinie: "rgba(250,106,28,0.6)",
  orangeDunkel: "#2A1A0B",
  aufOrange: "#FFFFFF",

  blau: "#4DA3FF",
  blauSoft: "rgba(77,163,255,0.14)",
  gruen: "#4ED053",
  gruenSoft: "rgba(78,208,83,0.15)",
  gruenDunkel: "#0B1B13",
  gruenOption: "#132E1C",
  rot: "#FF4A3D",
  rotSoft: "rgba(255,74,61,0.14)",
  pink: "#FF4D6D",
  gelb: "#FFB400",
  gelbSoft: "rgba(255,180,0,0.14)",
  bernstein: "#FD9E02",
  krone: "#FFB81C",

  // Flächen einzelner Elemente wie in der Vorlage
  kreisFlamme: "#3A2313",
  kreisSaeulen: "#141A1F",
  kreisStern: "#3D2A10",
  iconKreis: "#1B262D",
  tipp: "#261A10",
  ringSpur: "#262B31",
  kachelWeiss: "#FFFBF5",
  tabLeiste: "rgba(9,13,16,0.97)",

  // Verkehrszeichen und Lagepläne
  schildRot: "#C8102E",
  schildBlau: "#0058A3",
  schildGelb: "#F2C500",
  schildWeiss: "#FFFFFF",
  schildSchwarz: "#111111",
  asphalt: "#2B2E35",
  asphaltRand: "#3B3F48",
  gelaende: "#0C1014",
} as const;

/** Orangener Verlauf der Buttons: links heller, rechts ins Rote. */
export const orangeVerlauf = ["#FF8A2B", "#FA6A1C", "#F4501A"] as const;

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
/** Handschrift für den Slogan auf der Startseite. */
export const handschrift = "MarckScript_400Regular";

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

/** Farbe für eine Erfolgsquote wie in der Vorlage: grün ab 75 %, sonst orange. */
export function quoteFarbe(anteil: number): string {
  return anteil >= 0.75 ? farben.gruen : farben.orange;
}
