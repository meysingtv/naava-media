import { createContext, useContext } from "react";
import { Platform, useWindowDimensions } from "react-native";
import { usePathname } from "expo-router";

// Fenstergröße mit iPad-Hilfen: Seiten nutzen auf dem iPad die volle Breite,
// Raster bekommen dort mehr Spalten. Blätter und Dialoge bleiben schmal.
// Im Browser am PC (Web-Panel) steht links eine Seitenleiste und der Inhalt
// nutzt die ganze restliche Breite – useFenster liefert dann diese Breite.

/** Größte Breite von Blättern und Dialogen auf dem iPad. */
export const SPALTE_MAX = 720;

/** Ab dieser Fensterbreite läuft die Web-Version als Desktop (Seitenleiste statt Tab-Leiste). */
export const DESKTOP_AB = 1000;

/** Breite der Seitenleiste links am PC – bei kleineren Fenstern nur Symbole. */
export const SEITENLEISTE = 256;
export const SEITENLEISTE_SCHMAL = 84;

/** Seiten ohne Seitenleiste: Anmelden und Lern-Modi, die den Bildschirm für sich brauchen. */
const OHNE_LEISTE = new Set([
  "",
  "willkommen",
  "anmelden",
  "registrieren",
  "auth-callback",
  "passwort-neu",
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
]);

/** Anmelden & Co.: schmale Spalte wie ein Formular. */
const FORMULAR = new Set(["willkommen", "anmelden", "registrieren", "auth-callback", "passwort-neu", "einrichtung"]);

function bereichVon(pfad: string): string {
  return pfad.replace(/^\//, "").split("/")[0];
}

/** Steht auf dieser Seite am PC die Seitenleiste? */
export function zeigtSeitenleiste(pfad: string): boolean {
  return !OHNE_LEISTE.has(bereichVon(pfad));
}

/**
 * Aufteilung am PC: Breite der Seitenleiste (0 = keine) und größte Breite des
 * Inhalts. Mit Leiste nutzt der Inhalt den ganzen Rest, ohne Leiste stehen
 * Formulare und Lern-Modi in einer mittigen Spalte.
 */
export function desktopAufteilung(fenster: number, pfad: string): { leiste: number; inhalt: number } {
  const b = bereichVon(pfad);
  if (!OHNE_LEISTE.has(b)) {
    const leiste = fenster >= 1280 ? SEITENLEISTE : SEITENLEISTE_SCHMAL;
    return { leiste, inhalt: fenster - leiste };
  }
  return { leiste: 0, inhalt: Math.min(fenster, FORMULAR.has(b) ? 620 : 900) };
}

/** Läuft die App auf einem Tablet? */
export const istTablet = Platform.OS === "ios" && Platform.isPad;

/** Unterseiten am PC: Rand links/rechts und größte Breite (wie die Hauptseiten). */
export const UNTERSEITE_RAND = 24;
export const UNTERSEITE_MAX = 1640;
/** Breite der Spalte, in der eine Unterseite läuft (Seite setzt sie, useFenster liest sie). */
export const SpaltenKontext = createContext<number | null>(null);

/** Ist das ein Browserfenster in Desktop-Breite? */
export function istDesktop(breite: number): boolean {
  return Platform.OS === "web" && breite >= DESKTOP_AB;
}

/** Desktop-Ansicht im Browser (Seitenleiste links, Inhalt über die ganze Breite)? */
export function useDesktop(): boolean {
  return istDesktop(useWindowDimensions().width);
}

/**
 * Wie useWindowDimensions, dazu `tablet`: breites Fenster (iPad, nicht in
 * schmaler Split View) und `desktop`: Browser am PC – `width` ist dann die
 * Breite des Inhalts neben der Seitenleiste.
 */
export function useFenster() {
  const fenster = useWindowDimensions();
  const pfad = usePathname();
  const spalte = useContext(SpaltenKontext);
  if (istDesktop(fenster.width)) {
    const inhalt = desktopAufteilung(fenster.width, pfad).inhalt;
    return { ...fenster, width: spalte ? Math.min(inhalt, spalte) : inhalt, tablet: true, desktop: true };
  }
  return { ...fenster, tablet: fenster.width >= 600, desktop: false };
}
