import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { decode } from "jpeg-js";

import type { ZeichenKey } from "./fragen";
import { ausschnittVerkleinern, base64Bytes, KLASSEN, vorhersagen } from "./schild-netz";

/** Alle Schilder, die die Kamera erkennt – zugleich das Sammelalbum. */
export const ALBUM = KLASSEN.filter((k) => k !== "nichts") as ZeichenKey[];

/** Punkte für ein neu gefundenes Schild. */
export const XP_JE_SCHILD = 15;

/** Seitenlänge des Analysebilds (das Quadrat aus dem Sucherrahmen). */
const ANALYSE = 192;
/** Mittige Ausschnitte relativ zum Rahmen – deckt Schilder von etwa 30 bis 100 % der Rahmengröße ab. */
const AUSSCHNITTE = [1, 0.78, 0.6];
/** Ab dieser Wahrscheinlichkeit gilt ein Schild als erkannt … */
const SCHWELLE = 0.8;
/** … ab dieser fragt die App nach („Meintest du …?“). */
const VERMUTUNG = 0.35;

export type Rahmen = { x: number; y: number; groesse: number };

export type Erkennung = {
  /** Sicher erkanntes Schild – oder null. */
  key: ZeichenKey | null;
  /** Unsicherer Treffer, bei dem die App nachfragt – oder null. */
  vermutung: ZeichenKey | null;
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
  let beste = -1;
  let sicherheit = 0;
  for (const anteil of AUSSCHNITTE) {
    await pause();
    const s = Math.min(breite, hoehe) * anteil;
    const p = vorhersagen(ausschnittVerkleinern(rgba, breite, hoehe, (breite - s) / 2, (hoehe - s) / 2, s));
    for (let k = 0; k < p.length; k++) {
      if (KLASSEN[k] === "nichts") continue;
      if (p[k] > sicherheit) {
        sicherheit = p[k];
        beste = k;
      }
    }
  }
  const kandidat = beste >= 0 ? (KLASSEN[beste] as ZeichenKey) : null;
  return {
    key: sicherheit >= SCHWELLE ? kandidat : null,
    vermutung: sicherheit < SCHWELLE && sicherheit >= VERMUTUNG ? kandidat : null,
    sicherheit,
  };
}
