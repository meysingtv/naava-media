import { Platform, useWindowDimensions } from "react-native";

// Fenstergröße mit iPad-Hilfen: Seiten nutzen auf dem iPad die volle Breite,
// Raster bekommen dort mehr Spalten. Blätter und Dialoge bleiben schmal.
// Im Browser auf dem PC (Web-Panel) steht oben eine Navigationsleiste und der
// Inhalt läuft in einer mittigen Spalte – useFenster liefert dann deren Breite.

/** Größte Breite von Blättern und Dialogen auf dem iPad. */
export const SPALTE_MAX = 720;

/** Ab dieser Fensterbreite läuft die Web-Version als Desktop (Leiste oben statt unten). */
export const DESKTOP_AB = 1000;

/** Breite der Inhaltsspalte auf dem Desktop. */
export const DESKTOP_SPALTE = 1180;

/** Breitere Spalte für Seiten mit Tabellen (Manager). */
export const DESKTOP_BREIT = 1480;

/** Seiten, die am PC die breite Spalte bekommen. */
export function breiteSpalte(pfad: string): number {
  return pfad.startsWith("/manager") ? DESKTOP_BREIT : DESKTOP_SPALTE;
}

/** Höhe der Navigationsleiste oben auf dem Desktop. */
export const WEB_LEISTE = 68;

/** Läuft die App auf einem Tablet? */
export const istTablet = Platform.OS === "ios" && Platform.isPad;

/** Ist das ein Browserfenster in Desktop-Breite? */
export function istDesktop(breite: number): boolean {
  return Platform.OS === "web" && breite >= DESKTOP_AB;
}

/** Desktop-Ansicht im Browser (Leiste oben, Inhalt mittig)? */
export function useDesktop(): boolean {
  return istDesktop(useWindowDimensions().width);
}

/**
 * Wie useWindowDimensions, dazu `tablet`: breites Fenster (iPad, nicht in
 * schmaler Split View) und `desktop`: Browser am PC – `width` ist dann die
 * Breite der Inhaltsspalte.
 */
export function useFenster() {
  const fenster = useWindowDimensions();
  if (istDesktop(fenster.width)) return { ...fenster, width: Math.min(fenster.width, DESKTOP_SPALTE), tablet: true, desktop: true };
  return { ...fenster, tablet: fenster.width >= 600, desktop: false };
}
