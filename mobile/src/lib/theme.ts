// Design-Tokens – an iOS-Systemfarben angelehnt (ruhig, nativ, ein Akzent).
export type ThemeColors = {
  bg: string; // App-Hintergrund (gruppiert)
  card: string; // Listen-/Kartenfläche
  cardAlt: string; // gedrückte/sekundäre Fläche
  fill: string; // Track für Segmente/Progress
  separator: string; // Hairline
  text: string; // primäre Schrift
  textMuted: string; // sekundäre Schrift
  accent: string; // einziger Akzent
  onAccent: string;
  success: string;
  danger: string;
  warning: string;
};

export const lightColors: ThemeColors = {
  bg: "#F2F2F7",
  card: "#FFFFFF",
  cardAlt: "#EAEAEF",
  fill: "#E9E9EB",
  separator: "#D8D8DD",
  text: "#1C1C1E",
  textMuted: "#8A8A8E",
  accent: "#007AFF",
  onAccent: "#FFFFFF",
  success: "#34C759",
  danger: "#FF3B30",
  warning: "#FF9500",
};

export const darkColors: ThemeColors = {
  bg: "#000000",
  card: "#1C1C1E",
  cardAlt: "#2C2C2E",
  fill: "#2C2C2E",
  separator: "#38383A",
  text: "#FFFFFF",
  textMuted: "#98989F",
  accent: "#0A84FF",
  onAccent: "#FFFFFF",
  success: "#30D158",
  danger: "#FF453A",
  warning: "#FF9F0A",
};

export const radius = { sm: 8, md: 10, lg: 12, xl: 16, full: 999 };
export const space = (n: number) => n * 4;

export type BadgeFarbe = { bg: string; text: string };
