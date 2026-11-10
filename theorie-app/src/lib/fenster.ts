import { Platform, useWindowDimensions } from "react-native";
import { usePathname } from "expo-router";

// Fenstergröße mit iPad-Hilfen: Seiten nutzen auf dem iPad die volle Breite,
// Raster bekommen dort mehr Spalten. Blätter und Dialoge bleiben schmal.
// Im Browser auf dem PC (Web-Panel) steht links eine Seitenleiste. Die neu
// gestalteten Seiten (web/…) nutzen die ganze Breite daneben; Clips sowie
// Kamera- und Live-Seiten laufen in einer mittigen Spalte – useFenster liefert
// dann deren Breite.

/** Größte Breite von Blättern und Dialogen auf dem iPad. */
export const SPALTE_MAX = 720;

/** Ab dieser Fensterbreite läuft die Web-Version als Desktop (Leiste oben statt unten). */
export const DESKTOP_AB = 1000;

/** Breite der Inhaltsspalte auf dem Desktop. */
export const DESKTOP_SPALTE = 1180;

/** Breite der Seitenleiste links am PC (schmal: nur Symbole). */
export const SEITENLEISTE = 256;
export const SEITENLEISTE_SCHMAL = 88;
/** Ab dieser Fensterbreite zeigt die Seitenleiste auch die Namen. */
export const SEITENLEISTE_BREIT_AB = 1200;

/** Seiten ohne eigene PC-Fassung (Kamera, Live, fürs Handy gebaut) – sie laufen in einer mittigen Spalte. */
const HANDY = new Set(["live", "live-senden", "schild-scanner", "clip-hochladen"]);

/** Ein einzelner Clip (clip-ansicht) läuft am PC wie am Handy in einer schmalen Spalte. */
export const CLIPS_SPALTE = 560;

function bereich(pfad: string): string {
  return pfad.replace(/^\//, "").split("/")[0];
}

/** Breite der Inhaltsspalte am PC – undefined = ganze Breite. */
export function breiteSpalte(pfad: string): number | undefined {
  const b = bereich(pfad);
  if (b === "clip-ansicht") return CLIPS_SPALTE;
  if (HANDY.has(b)) return DESKTOP_SPALTE;
  return undefined;
}

/** Hat die Seite am PC eine eigene Fassung (web/…)? */
export function hatWebFassung(pfad: string): boolean {
  const b = bereich(pfad);
  return !HANDY.has(b) && b !== "clip-ansicht";
}

/** Seiten, die den ganzen Bildschirm brauchen (Prüfung, Training, Live …): dort keine Leiste. */
const OHNE_LEISTE = new Set([
  "",
  "willkommen",
  "anmelden",
  "registrieren",
  "einrichtung",
  "training",
  "pruefung",
  "duell",
  "online-duell",
  "live",
  "live-senden",
  "karten-lernen",
  "schild-scanner",
  "clip-ansicht",
  // Der Manager hat eine eigene Seitenleiste.
  "manager",
]);

export function zeigtWebLeiste(pfad: string): boolean {
  return !OHNE_LEISTE.has(bereich(pfad));
}

/** Läuft die App auf einem Tablet? */
export const istTablet = Platform.OS === "ios" && Platform.isPad;

/** Ist das ein Browserfenster in Desktop-Breite? */
export function istDesktop(breite: number): boolean {
  return Platform.OS === "web" && breite >= DESKTOP_AB;
}

/** Desktop-Ansicht im Browser (Seitenleiste links)? */
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
  const pfad = usePathname();
  if (istDesktop(fenster.width)) {
    const leiste = !zeigtWebLeiste(pfad ?? "") ? 0 : fenster.width >= SEITENLEISTE_BREIT_AB ? SEITENLEISTE : SEITENLEISTE_SCHMAL;
    const spalte = breiteSpalte(pfad ?? "") ?? Number.POSITIVE_INFINITY;
    return { ...fenster, width: Math.min(fenster.width - leiste, spalte), tablet: true, desktop: true };
  }
  return { ...fenster, tablet: fenster.width >= 600, desktop: false };
}
