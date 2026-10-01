import { meldung } from "@/lib/live";
import { supabase } from "@/lib/supabase";

// Tafel im Live: Der Inhaber malt mit dem Finger auf sein Bild aus der Galerie
// oder auf eine Vorlage. Punkte zählen von 0 bis 1000 in Breite und Höhe der
// Tafel – so passen die Striche auf jede Größe (große Tafel, kleines Bild im
// Video). Jeder Strich geht sofort über LiveKit an alle, der Stand liegt für
// Spätkommer auf dem Server (SQL Abschnitt 20).

export type TafelGrund = "bild" | "leer" | "kreuzung" | "kreisverkehr";
/** Ein Strich: Farbe, Pfeil ja/nein, Punkte als [x, y, x, y, …] (0–1000). */
export type Strich = { f: string; a?: boolean; p: number[] };
export type LiveTafel = { an: boolean; grund: TafelGrund; striche: Strich[] };

export const TAFEL_FARBEN = ["#FF6A1A", "#FFFFFF", "#FFD43B", "#FF3B5C", "#4DA3FF"] as const;
export const MAX_STRICHE = 80;
const MAX_PUNKTE = 200;

/** Seitenverhältnis (Breite / Höhe) der Vorlagen. */
export const VORLAGE_SEITE: Record<Exclude<TafelGrund, "bild">, number> = { leer: 4 / 3, kreuzung: 300 / 220, kreisverkehr: 300 / 220 };

export const GRUND_NAMEN: Record<TafelGrund, string> = { bild: "Bild", kreuzung: "Kreuzung", kreisverkehr: "Kreisverkehr", leer: "Leer" };

/** Strichbreite und Pfeilspitze im Verhältnis zur Tafelbreite. */
export const STRICH_BREITE = 0.0125;
export const SPITZE = 0.045;

export async function tafelSichern(liveId: string, tafel: LiveTafel | null): Promise<string | null> {
  const { error } = await supabase.rpc("lern_live_tafel_setzen", { p_live: liveId, p_tafel: tafel });
  return error ? meldung(error) : null;
}

// ---------------------------------------------------------------------------
// Striche glätten und zeichnen
// ---------------------------------------------------------------------------

function abstandZurLinie(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const l = dx * dx + dy * dy;
  if (l === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Unnötige Punkte weglassen (Douglas-Peucker), runden, höchstens 200 Punkte. */
export function vereinfachen(p: number[], toleranz = 2.2): number[] {
  const n = p.length / 2;
  if (n <= 2) return p.map((v) => Math.round(Math.min(1000, Math.max(0, v))));
  const behalten = new Array<boolean>(n).fill(false);
  behalten[0] = behalten[n - 1] = true;
  const stapel: [number, number][] = [[0, n - 1]];
  while (stapel.length) {
    const [a, b] = stapel.pop()!;
    let max = 0;
    let idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = abstandZurLinie(p[2 * i], p[2 * i + 1], p[2 * a], p[2 * a + 1], p[2 * b], p[2 * b + 1]);
      if (d > max) {
        max = d;
        idx = i;
      }
    }
    if (idx >= 0 && max > toleranz) {
      behalten[idx] = true;
      stapel.push([a, idx], [idx, b]);
    }
  }
  let aus: number[] = [];
  for (let i = 0; i < n; i++) if (behalten[i]) aus.push(p[2 * i], p[2 * i + 1]);
  // Noch zu viele? Gleichmäßig ausdünnen (Anfang und Ende bleiben).
  if (aus.length / 2 > MAX_PUNKTE) {
    const m = aus.length / 2;
    const neu: number[] = [];
    for (let k = 0; k < MAX_PUNKTE; k++) {
      const i = Math.round((k * (m - 1)) / (MAX_PUNKTE - 1));
      neu.push(aus[2 * i], aus[2 * i + 1]);
    }
    aus = neu;
  }
  return aus.map((v) => Math.round(Math.min(1000, Math.max(0, v))));
}

/** Glatter SVG-Pfad (Kurven durch die Mittelpunkte). `sx`/`sy` rechnen 0–1000 in die Zeichenfläche um. */
export function strichPfad(p: number[], sx: number, sy: number): string {
  const n = p.length / 2;
  if (n === 0) return "";
  const x = (i: number) => (p[2 * i] * sx).toFixed(1);
  const y = (i: number) => (p[2 * i + 1] * sy).toFixed(1);
  if (n === 1) return `M ${x(0)} ${y(0)} L ${x(0)} ${y(0)}`;
  if (n === 2) return `M ${x(0)} ${y(0)} L ${x(1)} ${y(1)}`;
  let d = `M ${x(0)} ${y(0)}`;
  for (let i = 1; i < n - 1; i++) {
    const mx = (((p[2 * i] + p[2 * i + 2]) / 2) * sx).toFixed(1);
    const my = (((p[2 * i + 1] + p[2 * i + 3]) / 2) * sy).toFixed(1);
    d += ` Q ${x(i)} ${y(i)} ${mx} ${my}`;
  }
  return `${d} L ${x(n - 1)} ${y(n - 1)}`;
}

/** Pfeilspitze am Ende (Dreieck) – Größe in Zeichenflächen-Einheiten. */
export function pfeilSpitze(p: number[], sx: number, sy: number, groesse: number): string {
  const n = p.length / 2;
  if (n < 2) return "";
  const ex = p[2 * (n - 1)] * sx;
  const ey = p[2 * (n - 1) + 1] * sy;
  const ax = p[0] * sx;
  const ay = p[1] * sy;
  const w = Math.atan2(ey - ay, ex - ax);
  const l = groesse;
  const b = groesse * 0.62;
  const bx = ex - Math.cos(w) * l;
  const by = ey - Math.sin(w) * l;
  const px = Math.cos(w + Math.PI / 2) * b;
  const py = Math.sin(w + Math.PI / 2) * b;
  const spitzeX = ex + Math.cos(w) * groesse * 0.25;
  const spitzeY = ey + Math.sin(w) * groesse * 0.25;
  return `${spitzeX.toFixed(1)},${spitzeY.toFixed(1)} ${(bx + px).toFixed(1)},${(by + py).toFixed(1)} ${(bx - px).toFixed(1)},${(by - py).toFixed(1)}`;
}

// ---------------------------------------------------------------------------
// Nachrichten über LiveKit (Kanal „tafel“) – reines ASCII
// ---------------------------------------------------------------------------

export type TafelNachricht =
  /** Tafel an/aus und Hintergrund (beim Wechsel ohne Striche) */
  | { k: "t"; an: boolean; g: TafelGrund; s?: Strich[] }
  /** Strich wird gerade gezogen (bisheriger Verlauf) */
  | { k: "z"; s: Strich }
  /** Strich fertig */
  | { k: "f"; s: Strich }
  /** Letzten Strich zurücknehmen */
  | { k: "u" }
  /** Alles löschen */
  | { k: "c" };

export const tafelNachricht = (n: TafelNachricht) => JSON.stringify(n);

const istStrich = (s: unknown): s is Strich =>
  Boolean(s) && typeof (s as Strich).f === "string" && Array.isArray((s as Strich).p) && (s as Strich).p.every((v) => typeof v === "number");

export function tafelAusNachricht(text: string): TafelNachricht | null {
  try {
    const n = JSON.parse(text) as TafelNachricht;
    if (n.k === "t" && typeof n.an === "boolean" && typeof n.g === "string") return n;
    if ((n.k === "z" || n.k === "f") && istStrich(n.s)) return n;
    if (n.k === "u" || n.k === "c") return n;
    return null;
  } catch {
    return null;
  }
}

/** Eine Nachricht auf den Stand anwenden („z“ ändert den Stand nicht, nur den laufenden Strich). */
export function tafelAnwenden(t: LiveTafel | null, n: TafelNachricht): LiveTafel | null {
  if (n.k === "t") {
    if (!n.an && n.g !== "bild") return null;
    const gleich = t && t.grund === n.g;
    return { an: n.an, grund: n.g, striche: n.s ?? (gleich ? t.striche : []) };
  }
  if (!t) return t;
  if (n.k === "f") return { ...t, striche: [...t.striche, n.s].slice(-MAX_STRICHE) };
  if (n.k === "u") return { ...t, striche: t.striche.slice(0, -1) };
  if (n.k === "c") return { ...t, striche: [] };
  return t;
}
