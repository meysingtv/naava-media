/**
 * Schilder-Erkennung direkt auf dem Gerät: ein kleines Faltungsnetz in reinem
 * JavaScript. Es braucht keine Internetverbindung, und kein Foto verlässt das Handy.
 *
 * Aufbau: eine normale 3×3-Faltung, dann tiefenweise separierbare Faltungen
 * (je Kanal 3×3, danach 1×1 über alle Kanäle), Mittelwert, voll verbundene Schicht.
 *
 * Eingabe: NETZ_GROESSE² Pixel RGB mit Werten von 0 bis 1 (Zeile für Zeile, je Pixel r, g, b).
 * Ausgabe: Wahrscheinlichkeit je Klasse (die Schilder aus dem Album + "nichts").
 */
import { SCHILD_GEWICHTE, SCHILD_GROESSE, SCHILD_KLASSEN, SCHILD_SCHICHTEN } from "./schilder-modell";

export const NETZ_GROESSE = SCHILD_GROESSE;
export const KLASSEN: readonly string[] = SCHILD_KLASSEN;

type Schicht = {
  art: "conv" | "sep" | "dense";
  ein: number;
  aus: number;
  pool: boolean;
  /** Je Ausgabekanal hintereinander (für schnelle Skalarprodukte): conv [aus][ky][kx][ein], sep/dense [aus][ein] */
  w: Float32Array;
  /** nur sep: tiefenweise [ky·3+kx][ein] */
  t: Float32Array;
  b: Float32Array;
};

/** [n][aus] → [aus][n] */
function transponiert(a: Float32Array, n: number, aus: number): Float32Array {
  const t = new Float32Array(a.length);
  for (let i = 0; i < n; i++) for (let q = 0; q < aus; q++) t[q * n + i] = a[i * aus + q];
  return t;
}

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
    const t = s.art === "sep" ? lesen(9 * s.ein) : new Float32Array(0);
    const n = s.art === "conv" ? 9 * s.ein : s.ein;
    const w = transponiert(lesen(n * s.aus), n, s.aus);
    const b = lesen(s.aus);
    return { art: s.art, ein: s.ein, aus: s.aus, pool: "pool" in s ? s.pool : false, w, t, b };
  });
  return geladen;
}

/** Bild mit einem Pixel Nullrand umgeben – so brauchen die Faltungen keine Randabfragen. */
function auffuellen(ein: Float32Array, h: number, w: number, c: number): Float32Array {
  const zeile = (w + 2) * c;
  const aus = new Float32Array((h + 2) * zeile);
  for (let y = 0; y < h; y++) aus.set(ein.subarray(y * w * c, (y + 1) * w * c), (y + 1) * zeile + c);
  return aus;
}

/** 3×3-Faltung mit Rand (same) und ReLU. Layout: [y][x][kanal]. */
function faltung(ein: Float32Array, h: number, w: number, c: number, s: Schicht): Float32Array {
  const k = s.aus;
  const n = 9 * c;
  const gew = s.w;
  const bias = s.b;
  const p = auffuellen(ein, h, w, c);
  const zeile = (w + 2) * c;
  const breit = 3 * c;
  const feld = new Float32Array(n);
  const aus = new Float32Array(h * w * k);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // 3×3-Nachbarschaft einsammeln (je Zeile liegen drei Pixel hintereinander)
      const basis = (y * (w + 2) + x) * c;
      let j = 0;
      for (let dy = 0; dy < 3; dy++) {
        const r = basis + dy * zeile;
        for (let i = 0; i < breit; i++) feld[j++] = p[r + i];
      }
      const o = (y * w + x) * k;
      for (let q = 0; q < k; q++) {
        let summe = bias[q];
        const wq = q * n;
        for (let i = 0; i < n; i++) summe += feld[i] * gew[wq + i];
        aus[o + q] = summe > 0 ? summe : 0;
      }
    }
  }
  return aus;
}

/** Separierbare Faltung: je Kanal 3×3 (ohne Bias), dann 1×1 über alle Kanäle, Bias und ReLU. */
function separierbar(ein: Float32Array, h: number, w: number, c: number, s: Schicht): Float32Array {
  const k = s.aus;
  const gew = s.w;
  const bias = s.b;
  const t = s.t;
  const p = auffuellen(ein, h, w, c);
  const z1 = (w + 2) * c;
  const z2 = 2 * z1;
  const c2 = 2 * c;
  const t3 = 3 * c, t4 = 4 * c, t5 = 5 * c, t6 = 6 * c, t7 = 7 * c, t8 = 8 * c;
  const tief = new Float32Array(c);
  const aus = new Float32Array(h * w * k);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = (y * (w + 2) + x) * c;
      for (let ci = 0; ci < c; ci++) {
        const i = a + ci;
        tief[ci] =
          p[i] * t[ci] + p[i + c] * t[c + ci] + p[i + c2] * t[c2 + ci] +
          p[i + z1] * t[t3 + ci] + p[i + z1 + c] * t[t4 + ci] + p[i + z1 + c2] * t[t5 + ci] +
          p[i + z2] * t[t6 + ci] + p[i + z2 + c] * t[t7 + ci] + p[i + z2 + c2] * t[t8 + ci];
      }
      const o = (y * w + x) * k;
      for (let q = 0; q < k; q++) {
        let summe = bias[q];
        const wq = q * c;
        let ci = 0;
        for (; ci + 3 < c; ci += 4) {
          summe += tief[ci] * gew[wq + ci] + tief[ci + 1] * gew[wq + ci + 1] + tief[ci + 2] * gew[wq + ci + 2] + tief[ci + 3] * gew[wq + ci + 3];
        }
        for (; ci < c; ci++) summe += tief[ci] * gew[wq + ci];
        aus[o + q] = summe > 0 ? summe : 0;
      }
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

/** Rohwerte (Logits) für ein Eingabebild. */
export function logitsBerechnen(bild: Float32Array): Float32Array {
  let x = bild;
  let h = NETZ_GROESSE;
  let w = NETZ_GROESSE;
  let c = 3;
  for (const s of schichten()) {
    if (s.art === "conv" || s.art === "sep") {
      x = s.art === "conv" ? faltung(x, h, w, c, s) : separierbar(x, h, w, c, s);
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
    for (let q = 0; q < c; q++) mittel[q] /= n;
    const logits = new Float32Array(s.aus);
    for (let o = 0; o < s.aus; o++) {
      let summe = s.b[o];
      const wo = o * c;
      for (let i = 0; i < c; i++) summe += mittel[i] * s.w[wo + i];
      logits[o] = summe;
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
 * Ausschnitt (Quadrat ab x0/y0 mit Kantenlänge s) aus einem RGBA-Bild auf die
 * Eingabegröße des Netzes verkleinern – als Flächenmittel, wie beim Training.
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
