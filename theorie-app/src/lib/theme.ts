// Design-Tokens von „Spur“. Farbwelt angelehnt an fahrschulpro.de: tiefes
// Nachtblau als Grund, Orange als einzige Signalfarbe. Flächen sind flach,
// Kanten nur als feine Haarlinien – keine Glanz- oder Glaseffekte.

export const farben = {
  grund: "#0A0F1E",
  grundHoch: "#0D1324",
  flaeche: "#121A2E",
  flaeche2: "#18213A",
  flaeche3: "#1F2A47",
  linie: "rgba(199,205,218,0.08)",
  linieStark: "rgba(199,205,218,0.16)",

  text: "#F4F6FA",
  text2: "#C7CDDA",
  text3: "#8A93A8",
  text4: "#5A6380",

  orange: "#F47B45",
  orangeTief: "#E8551A",
  orangeSoft: "rgba(244,123,69,0.13)",
  orangeLinie: "rgba(244,123,69,0.45)",
  aufOrange: "#0A0F1E",

  blau: "#64ACFF",
  blauSoft: "rgba(100,172,255,0.13)",
  gruen: "#38D39F",
  gruenSoft: "rgba(56,211,159,0.13)",
  rot: "#FF6B6B",
  rotSoft: "rgba(255,107,107,0.13)",
  gelb: "#FFC857",
  gelbSoft: "rgba(255,200,87,0.13)",

  // Verkehrszeichen und Lagepläne
  schildRot: "#C8102E",
  schildBlau: "#0058A3",
  schildGelb: "#F2C500",
  schildWeiss: "#FFFFFF",
  schildSchwarz: "#111111",
  asphalt: "#2A3350",
  asphaltRand: "#3A4566",
  gelaende: "#0F1629",
} as const;

export const schrift = {
  titel: "Archivo_800ExtraBold",
  titelFett: "Archivo_700Bold",
  titelHalb: "Archivo_600SemiBold",
  text: "Inter_400Regular",
  textMittel: "Inter_500Medium",
  textHalb: "Inter_600SemiBold",
  textFett: "Inter_700Bold",
} as const;

export const radius = { s: 10, m: 14, l: 20, xl: 26, voll: 999 } as const;

export const abstand = (n: number) => n * 4;

/** Seitenrand links/rechts. */
export const RAND = 20;
