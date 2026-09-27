/**
 * Schilder-Erkennung direkt auf dem Gerät: ein kleines Faltungsnetz in reinem
 * JavaScript. Es braucht keine Internetverbindung, und kein Foto verlässt das Handy.
 *
 * Eingabe: 48×48 Pixel RGB mit Werten von 0 bis 1 (Zeile für Zeile, je Pixel r, g, b).
 * Ausgabe: Wahrscheinlichkeit je Klasse (die Schilder aus dem Album + "nichts").
 */
import { SCHILD_GEWICHTE, SCHILD_KLASSEN, SCHILD_SCHICHTEN } from "./schilder-modell";

export const NETZ_GROESSE = 48;
export const KLASSEN: readonly string[] = SCHILD_KLASSEN;

type Schicht = { art: "conv" | "dense"; ein: number; aus: number; pool: boolean; w: Float32Array; b: Float32Array };

let geladen: Schicht[] | null = null;

const ZEICHEN = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function base64Bytes(text: string): Uint8Array {
  const tabelle = new Uint8Array(128);
  for (let i = 0; i < ZEICHEN.length; i++) tabelle[ZEICHEN.charCodeAt(i)] = i;
  const sauber = text.replace(/[^A-Za-z0-9+/]/g, "");
  const laenge = Math.floor((sauber.length * 3) / 4);
  const aus = new Uint8Array(laenge);
  let j = 0;
  for (let i = 0; i < sauber.length; i += 4) {
    const n =
      (tabelle[sauber.charCodeAt(i)] << 18) |
      (tabelle[sauber.charCodeAt(i + 1)] << 12) |
      ((i + 2 < sauber.length ? tabelle[sauber.charCodeAt(i + 2)] : 0) << 6) |
      (i + 3 < sauber.length ? tabelle[sauber.charCodeAt(i + 3)] : 0);
    if (j < laenge) aus[j++] = (n >> 16) & 255;
    if (j < laenge) aus[j++] = (n >> 8) & 255;
    if (j < laenge) aus[j++] = n & 255;
  }
  return aus;
}

/** IEEE-754 half precision → Zahl. */
function halb(h: number): number {
  const vorzeichen = h & 0x8000 ? -1 : 1;
  const exponent = (h >> 10) & 0x1f;
  const mantisse = h & 0x3ff;
  if (exponent === 0) return vorzeichen * mantisse * 5.960464477539063e-8; // 2^-24
  if (exponent === 31) return mantisse ? NaN : vorzeichen * Infinity;
  return vorzeichen * (1 + mantisse / 1024) * Math.pow(2, exponent - 15);
}

function schichten(): Schicht[] {
  if (geladen) return geladen;
  const bytes = base64Bytes(SCHILD_GEWICHTE);
  let pos = 0;
  const lesen = (n: number) => {
    const a = new Float32Array(n);
    for (let i = 0; i < n; i++, pos += 2) a[i] = halb(bytes[pos] | (bytes[pos + 1] << 8));
    return a;
  };
  geladen = SCHILD_SCHICHTEN.map((s) => {
    const w = lesen(s.art === "conv" ? 9 * s.ein * s.aus : s.ein * s.aus);
    const b = lesen(s.aus);
    return { art: s.art, ein: s.ein, aus: s.aus, pool: "pool" in s ? s.pool : false, w, b };
  });
  return geladen;
}

/** 3×3-Faltung mit Rand (same) und ReLU. Layout: [y][x][kanal]. */
function faltung(ein: Float32Array, h: number, w: number, c: number, s: Schicht): Float32Array {
  const k = s.aus;
  const gew = s.w;
  const aus = new Float32Array(h * w * k);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * k;
      for (let q = 0; q < k; q++) aus[o + q] = s.b[q];
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          const i0 = (yy * w + xx) * c;
          const w0 = ((dy + 1) * 3 + (dx + 1)) * c * k;
          for (let ci = 0; ci < c; ci++) {
            const v = ein[i0 + ci];
            // Nach ReLU ist gut die Hälfte null – überspringen spart viel Zeit.
            if (v === 0) continue;
            const wb = w0 + ci * k;
            for (let q = 0; q < k; q++) aus[o + q] += v * gew[wb + q];
          }
        }
      }
      for (let q = 0; q < k; q++) if (aus[o + q] < 0) aus[o + q] = 0;
    }
  }
  return aus;
}

function maxPool(ein: Float32Array, h: number, w: number, c: number): Float32Array {
  const h2 = h >> 1;
  const w2 = w >> 1;
  const aus = new Float32Array(h2 * w2 * c);
  for (let y = 0; y < h2; y++) {
    for (let x = 0; x < w2; x++) {
      const a = (2 * y * w + 2 * x) * c;
      const b = a + c;
      const d = a + w * c;
      const e = d + c;
      const o = (y * w2 + x) * c;
      for (let q = 0; q < c; q++) {
        let m = ein[a + q];
        if (ein[b + q] > m) m = ein[b + q];
        if (ein[d + q] > m) m = ein[d + q];
        if (ein[e + q] > m) m = ein[e + q];
        aus[o + q] = m;
      }
    }
  }
  return aus;
}

function softmax(logits: Float32Array): Float32Array {
  let max = -Infinity;
  for (const v of logits) if (v > max) max = v;
  const aus = new Float32Array(logits.length);
  let summe = 0;
  for (let i = 0; i < logits.length; i++) {
    aus[i] = Math.exp(logits[i] - max);
    summe += aus[i];
  }
  for (let i = 0; i < aus.length; i++) aus[i] /= summe;
  return aus;
}

/** Rohwerte (Logits) für ein 48×48-Bild. */
export function logitsBerechnen(bild: Float32Array): Float32Array {
  let x = bild;
  let h = NETZ_GROESSE;
  let w = NETZ_GROESSE;
  let c = 3;
  for (const s of schichten()) {
    if (s.art === "conv") {
      x = faltung(x, h, w, c, s);
      c = s.aus;
      if (s.pool) {
        x = maxPool(x, h, w, c);
        h >>= 1;
        w >>= 1;
      }
      continue;
    }
    // Mittel über alle Positionen, dann voll verbunden.
    const mittel = new Float32Array(c);
    const n = h * w;
    for (let i = 0; i < n; i++) for (let q = 0; q < c; q++) mittel[q] += x[i * c + q];
    const logits = new Float32Array(s.aus);
    for (let o = 0; o < s.aus; o++) logits[o] = s.b[o];
    for (let i = 0; i < c; i++) {
      const v = mittel[i] / n;
      if (v === 0) continue;
      const basis = i * s.aus;
      for (let o = 0; o < s.aus; o++) logits[o] += v * s.w[basis + o];
    }
    return logits;
  }
  throw new Error("Schilder-Netz ohne Ausgabe");
}

/** Wahrscheinlichkeit je Klasse (Reihenfolge wie KLASSEN). */
export function vorhersagen(bild: Float32Array): Float32Array {
  return softmax(logitsBerechnen(bild));
}

/**
 * Ausschnitt (Quadrat ab x0/y0 mit Kantenlänge s) aus einem RGBA-Bild auf 48×48
 * verkleinern – als Flächenmittel, wie beim Training.
 */
export function ausschnittVerkleinern(rgba: Uint8Array, breite: number, hoehe: number, x0: number, y0: number, s: number): Float32Array {
  const n = NETZ_GROESSE;
  const aus = new Float32Array(n * n * 3);
  const f = s / n;
  for (let y = 0; y < n; y++) {
    const ya = y0 + y * f;
    const yb = ya + f;
    for (let x = 0; x < n; x++) {
      const xa = x0 + x * f;
      const xb = xa + f;
      let r = 0;
      let g = 0;
      let b = 0;
      let summe = 0;
      for (let py = Math.floor(ya); py < yb; py++) {
        const wy = Math.min(yb, py + 1) - Math.max(ya, py);
        if (wy <= 0) continue;
        const zeile = Math.max(0, Math.min(hoehe - 1, py)) * breite;
        for (let px = Math.floor(xa); px < xb; px++) {
          const wx = Math.min(xb, px + 1) - Math.max(xa, px);
          if (wx <= 0) continue;
          const gewicht = wx * wy;
          const i = (zeile + Math.max(0, Math.min(breite - 1, px))) * 4;
          r += rgba[i] * gewicht;
          g += rgba[i + 1] * gewicht;
          b += rgba[i + 2] * gewicht;
          summe += gewicht;
        }
      }
      const o = (y * n + x) * 3;
      const teiler = summe * 255 || 1;
      aus[o] = r / teiler;
      aus[o + 1] = g / teiler;
      aus[o + 2] = b / teiler;
    }
  }
  return aus;
}
