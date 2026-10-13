import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";

// Zweite Kamera im Live (nur iPhone, nur Gastgeber): Die eine Kamera füllt das
// Bild, die andere liegt als runder Kreis darüber. Gerechnet wird nativ direkt vor
// dem Senden (modules/live-greenscreen, ZweitkameraProzessor) – die Zuschauer
// bekommen ein fertiges Bild. Geht nur auf iPhones, die zwei Kameras gleichzeitig
// können (ab iPhone XS/XR), und nur mit neu gebauter App.

type Nativ = {
  zweiKameras?: () => boolean;
  zweitkameraSetzen?: (lage: NativeLage) => void;
  zweitkameraAus?: () => void;
};

/** Für das native Modul: Kreis in Punkten der Bühne (Ursprung oben links). */
type NativeLage = { an: boolean; tausch: boolean; weich: boolean; x: number; y: number; d: number; breite: number; hoehe: number };

const nativ = Platform.OS === "ios" ? requireOptionalNativeModule<Nativ>("LiveGreenscreen") : null;

/** Name des Effekts – derselbe steht in ZweitkameraProzessor.swift. */
export const ZWEITKAMERA_EFFEKT = "fahrschul-zweitkamera";

export const zweiKamerasMoeglich = (() => {
  try {
    return Boolean(nativ?.zweiKameras?.());
  } catch {
    return false;
  }
})();

/**
 * Lage des Kreises wie beim Bild aus der Galerie: Mitte `x` als Anteil der
 * Breite, `y` als Anteil des freien Kamerabereichs unter der Kopfzeile, `d`
 * (Durchmesser) als Anteil der Bezugshöhe (siehe bildBasis in live-bild.tsx).
 */
export type KreisLage = { x: number; y: number; d: number };

/** Neuer Kreis: oben links (rechts stehen die Werkzeuge). */
export const KREIS_START: KreisLage = { x: 0.27, y: 0.17, d: 0.2 };

export const KREIS_GRENZEN = { xMin: 0.08, xMax: 0.92, yMin: 0.06, yMax: 0.94, dMin: 0.1, dMax: 0.62 };

const zwischen = (wert: number, min: number, max: number) => Math.min(max, Math.max(min, wert));

export function kreisBegrenzen(l: KreisLage): KreisLage {
  const g = KREIS_GRENZEN;
  return { x: zwischen(l.x, g.xMin, g.xMax), y: zwischen(l.y, g.yMin, g.yMax), d: zwischen(l.d, g.dMin, g.dMax) };
}

/** Kreis an das native Modul geben (an/aus, Tausch, Lage in Punkten der Bühne). */
export function zweitkameraSetzen(lage: NativeLage) {
  try {
    nativ?.zweitkameraSetzen?.(lage);
  } catch {
    // Modul fehlt (alte App) – dann gibt es den Knopf gar nicht
  }
}

export function zweitkameraAus() {
  try {
    nativ?.zweitkameraAus?.();
  } catch {
    // Modul fehlt oder schon aus
  }
}
