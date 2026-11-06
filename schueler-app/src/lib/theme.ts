// Design-Tokens der Schüler-App: frisch und farbig, aber ruhig lesbar.
// Kopfbereiche tragen einen Verlauf von Blau nach Türkis, Inhalte liegen als
// weiße Karten mit weichem Schatten auf einem leicht getönten Grund.
import type { ViewStyle } from "react-native";

export type ThemeColors = {
  bg: string; // getönter App-Hintergrund
  card: string; // Karten
  cardAlt: string; // gedrückte/sekundäre Fläche, Eingabefelder
  fill: string; // Spuren für Segmente/Balken
  separator: string; // Trennlinien
  text: string;
  textMuted: string;
  accent: string;
  onAccent: string;
  accentSoft: string; // getönte Akzentfläche
  success: string;
  danger: string;
  warning: string;
  heroVon: string; // Verlauf im Kopf
  heroBis: string;
  schatten: string;
};

export const lightColors: ThemeColors = {
  bg: "#F1F5FB",
  card: "#FFFFFF",
  cardAlt: "#EEF2F8",
  fill: "#E3E9F3",
  separator: "#E4E9F1",
  text: "#0F172A",
  textMuted: "#64748B",
  accent: "#2563EB",
  onAccent: "#FFFFFF",
  accentSoft: "#E6EEFF",
  success: "#12A150",
  danger: "#E5484D",
  warning: "#F08C00",
  heroVon: "#1D4ED8",
  heroBis: "#06B6D4",
  schatten: "#1E3A8A",
};

export const darkColors: ThemeColors = {
  bg: "#0A1120",
  card: "#131C2F",
  cardAlt: "#1B2640",
  fill: "#223052",
  separator: "#243150",
  text: "#F1F5F9",
  textMuted: "#94A3B8",
  accent: "#5B8DEF",
  onAccent: "#FFFFFF",
  accentSoft: "#1A2A4F",
  success: "#3DD68C",
  danger: "#FF6B6F",
  warning: "#FFB224",
  heroVon: "#1E3A8A",
  heroBis: "#0E7490",
  schatten: "#000000",
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 22, full: 999 };
export const space = (n: number) => n * 4;

/** Weiße Karte mit weichem Schatten – die Grundfläche aller Inhalte. */
export function karte(colors: ThemeColors): ViewStyle {
  return {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    shadowColor: colors.schatten,
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  };
}

export type BadgeFarbe = { bg: string; text: string };
