import { Platform, type TextStyle, type ViewStyle } from "react-native";

// Design-Tokens von „Fahrschul Pro“: tiefes Schwarz als Grund, kräftiges Orange als
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

  // Orange aus der Vorlage gemessen: kräftiges Rot-Orange für Knöpfe, Ring
  // und Tab-Leiste, wärmeres Orange für Punkte, Balken und Flamme.
  // Hauptfarbe ist Lila (Name „orange“ bleibt, damit alle Stellen sie finden).
  orange: "#7C4DFF",
  orangeHell: "#B794FF",
  orangeTief: "#5B2ED6",
  orangeSoft: "rgba(124,77,255,0.16)",
  orangeLinie: "rgba(124,77,255,0.6)",
  orangeDunkel: "#1F1B45",
  aufOrange: "#FFFFFF",
  flamme: "#7C4DFF",

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

/** Orange Verläufe, Element für Element aus der Vorlage gemessen. */
export const verlauf = {
  /** Große Knöpfe, von oben nach unten: oben heller, unten tiefer. */
  knopf: ["#9466FF", "#7C4DFF", "#6A35F0"],
  /** Heller Schein am linken Ende von „Lernen starten“, von links nach rechts. */
  knopfSchein: ["rgba(183,148,255,0.6)", "rgba(183,148,255,0.35)", "rgba(183,148,255,0.06)", "rgba(183,148,255,0)"],
  /** Aktiver Filter-Chip, von links nach rechts. */
  chip: ["#9466FF", "#7C4DFF", "#6A35F0"],
  /** Aktives Segment, von links nach rechts. */
  segment: ["#9466FF", "#7C4DFF"],
  /** Fortschrittsbalken auf der Startseite, von links nach rechts. */
  balken: ["#7C4DFF", "#9466FF"],
  /** Balken in den Kategorien, von links nach rechts. */
  kategorie: ["#7C4DFF", "#9466FF"],
  /** Säulen im Diagramm, von oben nach unten. */
  saeule: ["#B794FF", "#9466FF", "#7C4DFF", "#5B2ED6"],
  /** Großer Ring in der Statistik, von oben nach unten. */
  ring: ["#9466FF", "#5B2ED6"],
} as const;

type Gewicht = "400" | "500" | "600" | "700" | "800";

const INTER: Record<Gewicht, string> = {
  "400": "Inter_400Regular",
  "500": "Inter_500Medium",
  "600": "Inter_600SemiBold",
  "700": "Inter_700Bold",
  "800": "Inter_800ExtraBold",
};

/**
 * Auf dem iPhone die Systemschrift (San Francisco) wie in der Vorlage, sonst
 * Inter. Android setzt über und unter Text sonst zusätzlichen Innenabstand –
 * ohne ihn sitzen Texte wie auf dem iPhone.
 */
function schnitt(g: Gewicht): TextStyle {
  if (Platform.OS === "ios") return { fontFamily: "System", fontWeight: g };
  if (Platform.OS === "android") return { fontFamily: INTER[g], includeFontPadding: false };
  return { fontFamily: INTER[g] };
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

/** „#RRGGBB“ mit Deckkraft als rgba(). */
export function mitDeckkraft(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/**
 * Farbiges Leuchten bzw. Schatten. Auf dem iPhone wie gehabt über shadow*,
 * auf Android (und im Web) als boxShadow – iOS-Schatten zeichnet Android nicht.
 */
export function leuchten(farbe: string, deckkraft: number, radius: number, y = 0): ViewStyle {
  if (Platform.OS === "ios") return { shadowColor: farbe, shadowOpacity: deckkraft, shadowRadius: radius, shadowOffset: { width: 0, height: y } };
  return { boxShadow: `0px ${y}px ${radius * 2}px ${mitDeckkraft(farbe, deckkraft)}` };
}

export const radius = { s: 10, m: 14, l: 18, xl: 24, voll: 999 } as const;

export const abstand = (n: number) => n * 4;

/** Seitenrand links/rechts. */
export const RAND = 16;

/** Farbe für eine Erfolgsquote wie in der Vorlage: grün ab 75 %, sonst orange. */
export function quoteFarbe(anteil: number): string {
  return anteil >= 0.75 ? farben.gruen : farben.orangeHell;
}
