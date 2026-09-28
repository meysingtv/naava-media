import { createContext, useContext } from "react";
import { Platform, type TextStyle } from "react-native";

// Design-Tokens von „Spur“ (v4): ruhige, flache Flächen, feine Linien und
// Orange nur dort, wo es etwas zu tun gibt. Zwei Farbschemata – Dunkel und
// Hell (Weiß/Orange). Das alte Design ist in docs/design-v3-schwarz-orange.md
// beschrieben.

export type Farbschema = "dunkel" | "hell";

const DUNKEL_WERTE = {
  grund: "#09090B",
  grundHoch: "#0F0F12",
  flaeche: "#141417",
  flaeche2: "#1D1D21",
  flaeche3: "#2A2A30",
  /** Fläche der Antwort-Kästen. */
  option: "#141417",
  linie: "rgba(255,255,255,0.07)",
  linieStark: "rgba(255,255,255,0.13)",

  text: "#F4F4F5",
  text2: "#C8C8CE",
  text3: "#8D8D96",
  text4: "#5C5C64",

  orange: "#FF6B1A",
  orangeHell: "#FF8743",
  orangeTief: "#F2560B",
  /** Orange für Text und Symbole auf dem Grund. */
  orangeText: "#FF7C33",
  orangeSoft: "rgba(255,107,26,0.14)",
  orangeLinie: "rgba(255,107,26,0.5)",
  orangeDunkel: "#2B1A0E",
  aufOrange: "#FFFFFF",
  flamme: "#FF7A1F",

  blau: "#4DA3FF",
  blauSoft: "rgba(77,163,255,0.14)",
  gruen: "#3DD26B",
  gruenSoft: "rgba(61,210,107,0.14)",
  /** Fläche für „richtig“-Meldungen. */
  gruenDunkel: "#0F2417",
  gruenOption: "#12291A",
  rot: "#FF5A4F",
  rotSoft: "rgba(255,90,79,0.14)",
  /** Fläche für „falsch“-Meldungen. */
  rotDunkel: "#2A1513",
  pink: "#FF5C7A",
  gelb: "#FFC23D",
  gelbSoft: "rgba(255,194,61,0.14)",
  bernstein: "#FDA21E",
  krone: "#FFB81C",

  kreisFlamme: "#2E1D12",
  kreisSaeulen: "#1D1D21",
  kreisStern: "#2E2410",
  iconKreis: "#1D1D21",
  tipp: "#231A12",
  ringSpur: "#2A2A30",
  kachelWeiss: "#FFFBF5",
  tabLeiste: "rgba(12,12,14,0.97)",
  /** Aktiver Teil im Umschalter (Segment). */
  segmentAktiv: "#3A3A42",
  /** Text auf Fotos – in beiden Schemata weiß. */
  fotoText: "#FFFFFF",
  /** Abdunkeln hinter Fenstern. */
  abdunkeln: "rgba(0,0,0,0.62)",

  // Verkehrszeichen und Lagepläne – in beiden Schemata gleich
  schildRot: "#C8102E",
  schildBlau: "#0058A3",
  schildGelb: "#F2C500",
  schildWeiss: "#FFFFFF",
  schildSchwarz: "#111111",
  asphalt: "#2B2E35",
  asphaltRand: "#3B3F48",
  gelaende: "#0C1014",
};

export type Farbe = keyof typeof DUNKEL_WERTE;
export type Palette = Record<Farbe, string> & { hell: boolean; tastatur: "dark" | "light" };

export const DUNKEL: Palette = { ...DUNKEL_WERTE, hell: false, tastatur: "dark" };

export const HELL: Palette = {
  grund: "#FFFFFF",
  grundHoch: "#FAFAFB",
  flaeche: "#F4F4F6",
  flaeche2: "#EAEAEE",
  flaeche3: "#DCDCE2",
  option: "#F4F4F6",
  linie: "rgba(0,0,0,0.07)",
  linieStark: "rgba(0,0,0,0.13)",

  text: "#111114",
  text2: "#45454E",
  text3: "#83838C",
  text4: "#B3B3BB",

  orange: "#F9600F",
  orangeHell: "#FF8A45",
  orangeTief: "#E0500A",
  orangeText: "#E0550B",
  orangeSoft: "rgba(249,96,15,0.10)",
  orangeLinie: "rgba(249,96,15,0.45)",
  orangeDunkel: "#FFF1E8",
  aufOrange: "#FFFFFF",
  flamme: "#F9600F",

  blau: "#1F7AE0",
  blauSoft: "rgba(31,122,224,0.10)",
  gruen: "#1EA54C",
  gruenSoft: "rgba(30,165,76,0.10)",
  gruenDunkel: "#E9F7EE",
  gruenOption: "#E6F6EC",
  rot: "#E5392D",
  rotSoft: "rgba(229,57,45,0.09)",
  rotDunkel: "#FDECEA",
  pink: "#E83E62",
  gelb: "#CC8700",
  gelbSoft: "rgba(204,135,0,0.12)",
  bernstein: "#E08A00",
  krone: "#E0A000",

  kreisFlamme: "#FFEBDD",
  kreisSaeulen: "#EDEDF1",
  kreisStern: "#FFF3D6",
  iconKreis: "#EDEDF1",
  tipp: "#FFF4EA",
  ringSpur: "#E4E4EA",
  kachelWeiss: "#FFFFFF",
  tabLeiste: "rgba(255,255,255,0.97)",
  segmentAktiv: "#FFFFFF",
  fotoText: "#FFFFFF",
  abdunkeln: "rgba(0,0,0,0.35)",

  schildRot: DUNKEL_WERTE.schildRot,
  schildBlau: DUNKEL_WERTE.schildBlau,
  schildGelb: DUNKEL_WERTE.schildGelb,
  schildWeiss: DUNKEL_WERTE.schildWeiss,
  schildSchwarz: DUNKEL_WERTE.schildSchwarz,
  asphalt: DUNKEL_WERTE.asphalt,
  asphaltRand: DUNKEL_WERTE.asphaltRand,
  gelaende: DUNKEL_WERTE.gelaende,

  hell: true,
  tastatur: "light",
};

/**
 * Die aktuelle Palette. Beim Umschalten werden die Werte ausgetauscht und die
 * App neu aufgebaut (siehe lib/erscheinung.tsx) – so lesen alle Stellen, die
 * `farben.x` beim Zeichnen verwenden, automatisch das richtige Schema.
 */
export const farben: Palette = { ...DUNKEL };

type Zwei = readonly [string, string];
type Drei = readonly [string, string, string];
type Vier = readonly [string, string, string, string];

function verlaeufeFuer(f: Palette) {
  const o = f.orange;
  const t = "transparent";
  return {
    knopf: [o, o, o] as Drei,
    knopfSchein: [t, t, t, t] as Vier,
    chip: [o, o, o] as Drei,
    segment: [o, o] as Zwei,
    balken: [o, o] as Zwei,
    kategorie: [o, o] as Zwei,
    saeule: [f.orangeHell, o, o, f.orangeTief] as Vier,
    ring: [o, o] as Zwei,
  };
}

/** Frühere Verläufe – im neuen Design flach, bleiben für ältere Stellen erhalten. */
export const verlauf = verlaeufeFuer(farben);

/** Schema übernehmen – danach muss die App neu gezeichnet werden. */
export function farbschemaAnwenden(schema: Farbschema) {
  Object.assign(farben, schema === "hell" ? HELL : DUNKEL);
  Object.assign(verlauf, verlaeufeFuer(farben));
}

/**
 * Palette für geteilte Bausteine. Normal ist das die aktuelle Palette; Bereiche,
 * die immer dunkel bleiben (Clips), setzen `DUNKEL` über `FarbKontext`.
 */
export const FarbKontext = createContext<Palette>(farben);

export function useFarben(): Palette {
  return useContext(FarbKontext);
}

type Gewicht = "400" | "500" | "600" | "700" | "800";

const INTER: Record<Gewicht, string> = {
  "400": "Inter_400Regular",
  "500": "Inter_500Medium",
  "600": "Inter_600SemiBold",
  "700": "Inter_700Bold",
  "800": "Inter_800ExtraBold",
};

/** Auf dem iPhone die Systemschrift (San Francisco), sonst Inter. */
function schnitt(g: Gewicht): TextStyle {
  return Platform.OS === "ios" ? { fontFamily: "System", fontWeight: g } : { fontFamily: INTER[g] };
}

export const schrift = {
  titel: schnitt("700"),
  titelFett: schnitt("700"),
  titelHalb: schnitt("600"),
  text: schnitt("400"),
  textMittel: schnitt("500"),
  textHalb: schnitt("600"),
  textFett: schnitt("700"),
};

/** Handschrift für den Slogan auf der Startseite. */
export const handschrift = "MarckScript_400Regular";

/** Schriften für SVG-Grafiken (brauchen einen festen Namen). */
export const svgSchrift = {
  text: "Inter_600SemiBold",
  fett: "Inter_700Bold",
  /** Schmale Schrift für Zahlen auf Verkehrszeichen und das Logo. */
  schild: "Archivo_800ExtraBold",
} as const;

export const radius = { s: 10, m: 14, l: 16, xl: 20, voll: 999 } as const;

export const abstand = (n: number) => n * 4;

/** Seitenrand links/rechts. */
export const RAND = 16;

/** Farbe für eine Erfolgsquote: grün ab 75 %, sonst orange. */
export function quoteFarbe(anteil: number): string {
  return anteil >= 0.75 ? farben.gruen : farben.orange;
}
