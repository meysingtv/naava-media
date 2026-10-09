import { Platform, useWindowDimensions } from "react-native";

// Fenstergröße mit iPad-Hilfen: Seiten nutzen auf dem iPad die volle Breite,
// Raster bekommen dort mehr Spalten. Blätter und Dialoge bleiben schmal.

/** Größte Breite von Blättern und Dialogen auf dem iPad. */
export const SPALTE_MAX = 720;

/** Läuft die App auf einem Tablet? */
export const istTablet = Platform.OS === "ios" && Platform.isPad;

/** Wie useWindowDimensions, dazu `tablet`: breites Fenster (iPad, nicht in schmaler Split View). */
export function useFenster() {
  const fenster = useWindowDimensions();
  return { ...fenster, tablet: fenster.width >= 600 };
}
