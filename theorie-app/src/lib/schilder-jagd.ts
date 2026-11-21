import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { decode } from "jpeg-js";

import { ZEICHEN_INFO, type ZeichenInfo } from "@/components/zeichen";

import type { ZeichenKey } from "./fragen";
import { ausschnittVerkleinern, base64Bytes, KLASSEN, vorhersagen } from "./schild-netz";

/** Alle Schilder, die die Kamera erkennt – zugleich das Sammelalbum (in Katalog-Reihenfolge). */
export const ALBUM: ZeichenKey[] = ZEICHEN_INFO.map((z) => z.key).filter((k) => KLASSEN.includes(k));

export function schildInfo(key: ZeichenKey): ZeichenInfo | undefined {
  return ZEICHEN_INFO.find((z) => z.key === key);
}

/** Punkte für ein neu gefundenes Schild. */
export const XP_JE_SCHILD = 15;
/** Bonus, wenn man nach dem Fund die Bedeutung richtig tippt. */
export const XP_QUIZ = 10;

/** Seitenlänge des Analysebilds (das Quadrat aus dem Sucherrahmen). */
const ANALYSE = 224;
/** Mittige Ausschnitte relativ zum Rahmen – deckt Schilder von etwa 30 bis 100 % der Rahmengröße ab. */
const AUSSCHNITTE = [1, 0.8, 0.62];
/** Ab dieser Wahrscheinlichkeit gilt ein Schild als erkannt … */
const SCHWELLE = 0.8;
/** … ab dieser schlägt die App Schilder zur Auswahl vor. */
const VERMUTUNG = 0.3;
/** Zweiter Vorschlag nur, wenn er noch einigermaßen wahrscheinlich ist. */
const ZWEITER = 0.12;
/** So eindeutig, dass die übrigen Ausschnitte nicht mehr gerechnet werden müssen. */
const EINDEUTIG = 0.93;

export type Rahmen = { x: number; y: number; groesse: number };

export type Erkennung = {
  /** Sicher erkanntes Schild – oder null. */
  key: ZeichenKey | null;
  /** Unsicher: bis zu zwei Schilder zur Auswahl („Welches ist es?“). */
  vorschlaege: ZeichenKey[];
  sicherheit: number;
};

const pause = () => new Promise<void>((fertig) => setTimeout(fertig, 0));

/** Quadrat aus dem Foto ausschneiden, klein rechnen und die Pixel lesen. */
async function analysebild(uri: string, rahmen: Rahmen) {
  const kontext = ImageManipulator.manipulate(uri);
  kontext
    .crop({ originX: rahmen.x, originY: rahmen.y, width: rahmen.groesse, height: rahmen.groesse })
    .resize({ width: ANALYSE, height: ANALYSE });
  const bild = await kontext.renderAsync();
  try {
    const ergebnis = await bild.saveAsync({ base64: true, compress: 0.92, format: SaveFormat.JPEG });
    const roh = decode(base64Bytes(ergebnis.base64 ?? ""), { useTArray: true, formatAsRGBA: true });
    return { rgba: roh.data, breite: roh.width, hoehe: roh.height };
  } finally {
    bild.release();
    kontext.release();
  }
}

/** Ganzzahliges Quadrat, das sicher im Bild liegt (sonst lehnt das Zuschneiden ab). */
function imBild(r: Rahmen, breite: number, hoehe: number): Rahmen {
  const x = Math.max(0, Math.floor(r.x));
  const y = Math.max(0, Math.floor(r.y));
  const groesse = Math.max(1, Math.floor(Math.min(r.groesse, breite - x, hoehe - y)));
  return { x, y, groesse };
}

/** Mittleres Quadrat eines Bildes (z. B. aus der Mediathek). */
export function mittelQuadrat(breite: number, hoehe: number): Rahmen {
  const groesse = Math.min(breite, hoehe);
  return imBild({ x: (breite - groesse) / 2, y: (hoehe - groesse) / 2, groesse }, breite, hoehe);
}

/**
 * Sucherrahmen (Bildschirm-Koordinaten) auf das Foto umrechnen. Die Vorschau füllt
 * die Ansicht wie "cover" – also mittig beschnitten.
 */
export function rahmenImFoto(foto: { breite: number; hoehe: number }, ansicht: { breite: number; hoehe: number }, rahmen: Rahmen): Rahmen {
  const skala = Math.max(ansicht.breite / foto.breite, ansicht.hoehe / foto.hoehe);
  const versatzX = (foto.breite - ansicht.breite / skala) / 2;
  const versatzY = (foto.hoehe - ansicht.hoehe / skala) / 2;
  const groesse = Math.min(rahmen.groesse / skala, foto.breite, foto.hoehe);
  const x = Math.min(Math.max(0, versatzX + rahmen.x / skala), foto.breite - groesse);
  const y = Math.min(Math.max(0, versatzY + rahmen.y / skala), foto.hoehe - groesse);
  return imBild({ x, y, groesse }, foto.breite, foto.hoehe);
}

/** Schild im Rahmen erkennen – komplett auf dem Gerät. */
export async function schildErkennen(uri: string, rahmen: Rahmen): Promise<Erkennung> {
  const { rgba, breite, hoehe } = await analysebild(uri, rahmen);
  // Höchste Wahrscheinlichkeit je Schild über alle Ausschnitte
  const beste = new Float32Array(KLASSEN.length);
  for (const anteil of AUSSCHNITTE) {
    await pause();
    const s = Math.min(breite, hoehe) * anteil;
    const p = vorhersagen(ausschnittVerkleinern(rgba, breite, hoehe, (breite - s) / 2, (hoehe - s) / 2, s));
    let top = 0;
    for (let k = 0; k < p.length; k++) {
      if (p[k] > beste[k]) beste[k] = p[k];
      if (KLASSEN[k] !== "nichts" && p[k] > top) top = p[k];
    }
    // Eindeutig erkannt – die kleineren Ausschnitte sparen wir uns.
    if (top >= EINDEUTIG) break;
  }
  const rangfolge = KLASSEN.map((k, i) => ({ k, p: beste[i] }))
    .filter((e) => e.k !== "nichts")
    .sort((a, b) => b.p - a.p);
  const [erster, zweiter] = rangfolge;
  const sicherheit = erster?.p ?? 0;
  if (sicherheit >= SCHWELLE) return { key: erster.k as ZeichenKey, vorschlaege: [], sicherheit };
  const vorschlaege: ZeichenKey[] = [];
  if (sicherheit >= VERMUTUNG) {
    vorschlaege.push(erster.k as ZeichenKey);
    if (zweiter && zweiter.p >= ZWEITER) vorschlaege.push(zweiter.k as ZeichenKey);
  }
  return { key: null, vorschlaege, sicherheit };
}
