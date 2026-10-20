import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

import { dateiHochladen } from "@/lib/clips-server";
import { meldung } from "@/lib/live";
import { supabase } from "@/lib/supabase";

// Bild im Live: Der Gastgeber holt ein Bild aus seiner Galerie, es liegt
// öffentlich im Speicher „lern-live“. Die Lage zählt in Anteilen des
// Videobereichs (Mitte x/y, Höhe g) – so passt sie auf jedes Handy und wandert
// mit, wenn das Video beim Quiz kleiner wird. Bewegungen gehen live über LiveKit
// an alle, die letzte Lage liegt für Spätkommer auf dem Server (SQL Abschnitt 19).

export const LIVE_BILD_BUCKET = "lern-live";

export type BildLage = { x: number; y: number; g: number };
/** `seite` = Breite / Höhe des Bilds. */
export type LiveBild = BildLage & { pfad: string; seite: number };

/** Wo ein neues Bild erscheint: mittig, etwas über der Mitte, gut ein Drittel hoch. */
export const BILD_START: BildLage = { x: 0.5, y: 0.42, g: 0.34 };

const zwischen = (wert: number, min: number, max: number) => Math.min(max, Math.max(min, wert));

/** Lage in den erlaubten Bereich holen (das Bild bleibt im Video, nicht zu klein, nicht zu groß). */
export function bildBegrenzen(l: BildLage): BildLage {
  return { x: zwischen(l.x, 0.04, 0.96), y: zwischen(l.y, 0.04, 0.96), g: zwischen(l.g, 0.08, 1.1) };
}

export function liveBildUrl(pfad: string): string {
  return supabase.storage.from(LIVE_BILD_BUCKET).getPublicUrl(pfad).data.publicUrl;
}

/**
 * Bild aus der Galerie wählen, auf höchstens 1440 px verkleinern und hochladen.
 * `null`, wenn nichts gewählt wurde.
 */
export async function liveBildHochladen(): Promise<{ pfad: string; seite: number } | null> {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
  const datei = r.canceled ? null : r.assets?.[0];
  if (!datei) return null;
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) throw new Error("Bitte melde dich an.");

  const lang = Math.max(datei.width, datei.height);
  const faktor = lang > 1440 ? 1440 / lang : 1;
  const kontext = ImageManipulator.manipulate(datei.uri);
  if (faktor < 1) kontext.resize({ width: Math.round(datei.width * faktor), height: Math.round(datei.height * faktor) });
  const bild = await kontext.renderAsync();
  let fertig: { uri: string; width: number; height: number };
  try {
    fertig = await bild.saveAsync({ compress: 0.82, format: SaveFormat.JPEG });
  } finally {
    bild.release();
    kontext.release();
  }
  const pfad = `${session.user.id}/${Date.now().toString(36)}.jpg`;
  await dateiHochladen(LIVE_BILD_BUCKET, fertig.uri, pfad, "image/jpeg", session.access_token);
  return { pfad, seite: fertig.height > 0 ? fertig.width / fertig.height : 1 };
}

/** Lage (oder `null` = entfernen) auf dem Server sichern – für alle, die später dazukommen. */
export async function liveBildSichern(liveId: string, bild: LiveBild | null): Promise<string | null> {
  const { error } = await supabase.rpc("lern_live_bild_setzen", {
    p_live: liveId,
    p_pfad: bild?.pfad ?? null,
    p_seite: bild?.seite ?? null,
    p_x: bild?.x ?? null,
    p_y: bild?.y ?? null,
    p_groesse: bild?.g ?? null,
  });
  return error ? meldung(error) : null;
}

export function liveBildDateiLoeschen(pfad: string) {
  supabase.storage
    .from(LIVE_BILD_BUCKET)
    .remove([pfad])
    .then(
      () => {},
      () => {},
    );
}

// ---------------------------------------------------------------------------
// Nachricht über LiveKit: {"p":pfad|null,"s":seite,"x","y","g"} – nur ASCII
// ---------------------------------------------------------------------------

export function bildNachricht(bild: LiveBild | null): string {
  if (!bild) return JSON.stringify({ p: null });
  const r = (n: number) => Math.round(n * 10000) / 10000;
  return JSON.stringify({ p: bild.pfad, s: r(bild.seite), x: r(bild.x), y: r(bild.y), g: r(bild.g) });
}

/** `undefined` bei unlesbarer Nachricht, `null` = Bild entfernt. */
export function bildAusNachricht(text: string): LiveBild | null | undefined {
  try {
    const d = JSON.parse(text) as { p?: string | null; s?: number; x?: number; y?: number; g?: number };
    if (d.p === null) return null;
    if (typeof d.p !== "string" || typeof d.x !== "number" || typeof d.y !== "number" || typeof d.g !== "number") return undefined;
    return { pfad: d.p, seite: typeof d.s === "number" && d.s > 0 ? d.s : 1, ...bildBegrenzen({ x: d.x, y: d.y, g: d.g }) };
  } catch {
    return undefined;
  }
}

/** Text ↔ Bytes für den Datenkanal (die Nachrichten sind reines ASCII). */
export function textZuBytes(text: string): Uint8Array {
  const b = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) b[i] = text.charCodeAt(i) & 0x7f;
  return b;
}

export function bytesZuText(b: Uint8Array): string {
  let t = "";
  for (let i = 0; i < b.length; i++) t += String.fromCharCode(b[i]);
  return t;
}
