import { useEffect, useSyncExternalStore } from "react";

import { dateiHochladen, MAX_VIDEO_BYTES } from "./clips-server";
import { serverVerbunden, supabase } from "./supabase";
import { verkleinernNoetig, videoVerkleinern } from "./video-verkleinern";

/**
 * Erklärvideos zu einzelnen Fragen (SQL Abschnitt 21). Der Inhaber lädt sie in
 * den Einstellungen hoch, beim Lernen erscheint dann neben der KI-Hilfe ein
 * Video-Knopf. Die Liste ist klein und wird einmal je App-Start geladen.
 */

export const ERKLAER_BUCKET = "lern-erklaervideos";

export type Erklaervideo = { frage_id: string; pfad: string; dauer: number | null; aktualisiert_am: string };

type Stand = { geladen: boolean; videos: Record<string, Erklaervideo> };

let stand: Stand = { geladen: false, videos: {} };
let laedt: Promise<void> | null = null;
const hoerer = new Set<() => void>();

function setzen(neu: Stand) {
  stand = neu;
  hoerer.forEach((h) => h());
}

function abonnieren(h: () => void) {
  hoerer.add(h);
  return () => {
    hoerer.delete(h);
  };
}

/** Liste vom Server holen (mehrfache Aufrufe teilen sich eine Anfrage). */
export function erklaervideosLaden(): Promise<void> {
  if (!serverVerbunden) {
    if (!stand.geladen) setzen({ geladen: true, videos: {} });
    return Promise.resolve();
  }
  if (laedt) return laedt;
  laedt = (async () => {
    try {
      const { data, error } = await supabase.from("lern_erklaervideo").select("frage_id, pfad, dauer, aktualisiert_am");
      if (error) throw error;
      const videos: Record<string, Erklaervideo> = {};
      for (const v of (data ?? []) as Erklaervideo[]) videos[v.frage_id] = v;
      setzen({ geladen: true, videos });
    } catch {
      // Ohne Netz: nur die eingebauten Animationen
      if (!stand.geladen) setzen({ geladen: true, videos: {} });
    } finally {
      laedt = null;
    }
  })();
  return laedt;
}

/** Alle Erklärvideos (frage_id → Video). Lädt beim ersten Gebrauch. */
export function useErklaervideos(): Stand {
  const s = useSyncExternalStore(abonnieren, () => stand);
  useEffect(() => {
    if (!s.geladen) erklaervideosLaden();
  }, [s.geladen]);
  return s;
}

/** Öffentliche Adresse eines Videos (CDN). */
export function erklaervideoUrl(pfad: string): string {
  return supabase.storage.from(ERKLAER_BUCKET).getPublicUrl(pfad).data.publicUrl;
}

function meldung(e: unknown): string {
  const text = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : String(e);
  if (/nur für den inhaber|row-level security|berechtigung/i.test(text)) return "Erklärvideos kann nur der Inhaber hochladen.";
  if (/network|fetch|internet/i.test(text)) return "Keine Verbindung. Bitte prüfe dein Internet.";
  if (/payload too large|too large|413/i.test(text)) return "Das Video ist zu groß (höchstens 50 MB). Kürze es etwas.";
  return text;
}

/**
 * Inhaber: Video zu einer Frage hochladen (ersetzt ein altes). Android rechnet
 * vorher auf 720p herunter – das iPhone macht das schon beim Auswählen.
 */
export async function erklaervideoHochladen(d: {
  frageId: string;
  uri: string;
  dauer: number | null;
  groesse: number | null;
  onVorbereitung?: (anteil: number | null) => void;
  onFortschritt?: (anteil: number) => void;
  abbruch?: { aktuell: (() => void) | null };
}): Promise<void> {
  if (!serverVerbunden) throw new Error("Die App ist noch mit keinem Server verbunden.");
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) throw new Error("Bitte melde dich an.");

  let uri = d.uri;
  let groesse = d.groesse;
  if (verkleinernNoetig) {
    d.onVorbereitung?.(0);
    const klein = await videoVerkleinern(uri, (a) => d.onVorbereitung?.(a), d.abbruch);
    d.onVorbereitung?.(null);
    if (klein) {
      uri = klein.uri;
      groesse = klein.groesse ?? groesse;
    }
  }
  if (groesse && groesse > MAX_VIDEO_BYTES) throw new Error("Das Video ist zu groß (höchstens 50 MB). Kürze es etwas.");

  const mov = /\.mov$/i.test(uri);
  const pfad = `${d.frageId}/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}.${mov ? "mov" : "mp4"}`;
  try {
    await dateiHochladen(ERKLAER_BUCKET, uri, pfad, mov ? "video/quicktime" : "video/mp4", session.access_token, d.onFortschritt, d.abbruch);
  } catch (e) {
    throw new Error(meldung(e));
  }
  const { data: alt, error } = await supabase.rpc("lern_erklaervideo_setzen", { p_frage: d.frageId, p_pfad: pfad, p_dauer: d.dauer });
  if (error) {
    await supabase.storage.from(ERKLAER_BUCKET).remove([pfad]).catch(() => {});
    throw new Error(meldung(error));
  }
  if (typeof alt === "string" && alt) await supabase.storage.from(ERKLAER_BUCKET).remove([alt]).catch(() => {});
  setzen({ geladen: true, videos: { ...stand.videos, [d.frageId]: { frage_id: d.frageId, pfad, dauer: d.dauer, aktualisiert_am: new Date().toISOString() } } });
}

/** Inhaber: Video einer Frage löschen (Eintrag und Datei). */
export async function erklaervideoLoeschen(frageId: string): Promise<void> {
  const { data: pfad, error } = await supabase.rpc("lern_erklaervideo_loeschen", { p_frage: frageId });
  if (error) throw new Error(meldung(error));
  if (typeof pfad === "string" && pfad) await supabase.storage.from(ERKLAER_BUCKET).remove([pfad]).catch(() => {});
  const videos = { ...stand.videos };
  delete videos[frageId];
  setzen({ geladen: true, videos });
}
