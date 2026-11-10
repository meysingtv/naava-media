import { useEffect, useSyncExternalStore } from "react";

import { ERKLAER_BUCKET } from "./erklaervideos";
import { serverVerbunden, supabase } from "./supabase";
import { dateiName, videoEndung, webHochladen } from "./web-hochladen";

/**
 * Videos zu ganzen Themen (SQL Abschnitt 26), z. B. „Vorfahrt in 3 Minuten“.
 * Der Inhaber lädt sie im Manager hoch, sie erscheinen auf der Themenseite.
 * Die Dateien liegen im Speicher der Erklärvideos, Ordner „thema-<id>/“.
 */

export type Themavideo = {
  id: string;
  thema_id: string;
  titel: string;
  pfad: string;
  dauer: number | null;
  position: number;
  erstellt_am: string;
};

type Stand = { geladen: boolean; videos: Themavideo[] };

let stand: Stand = { geladen: false, videos: [] };
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

function meldung(e: unknown): string {
  const text = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : String(e);
  if (/nur für den inhaber|row-level security/i.test(text)) return "Themenvideos kann nur der Inhaber verwalten.";
  if (/lern_themavideo|schema cache|function/i.test(text)) return "Das SQL-Update für den Manager fehlt noch (supabase/update-manager.sql).";
  if (/network|fetch/i.test(text)) return "Keine Verbindung. Bitte prüfe dein Internet.";
  return text;
}

/** Liste vom Server holen. `neu` lädt auch dann, wenn schon geladen. */
export function themenvideosLaden(neu = false): Promise<void> {
  if (!serverVerbunden) {
    if (!stand.geladen) setzen({ geladen: true, videos: [] });
    return Promise.resolve();
  }
  if (laedt) return laedt;
  if (stand.geladen && !neu) return Promise.resolve();
  laedt = (async () => {
    try {
      const { data, error } = await supabase
        .from("lern_themavideo")
        .select("id, thema_id, titel, pfad, dauer, position, erstellt_am")
        .order("position")
        .order("erstellt_am");
      if (error) throw error;
      setzen({ geladen: true, videos: (data ?? []) as Themavideo[] });
    } catch {
      // Ohne Netz oder ohne SQL-Update: einfach keine Themenvideos
      if (!stand.geladen) setzen({ geladen: true, videos: [] });
    } finally {
      laedt = null;
    }
  })();
  return laedt;
}

/** Alle Themenvideos. Lädt beim ersten Gebrauch. */
export function useThemenvideos(): Stand {
  const s = useSyncExternalStore(abonnieren, () => stand);
  useEffect(() => {
    if (!s.geladen) themenvideosLaden();
  }, [s.geladen]);
  return s;
}

/** Öffentliche Adresse eines Themenvideos (CDN). */
export function themavideoUrl(pfad: string): string {
  return supabase.storage.from(ERKLAER_BUCKET).getPublicUrl(pfad).data.publicUrl;
}

/** Inhaber (Web-Panel): Video zu einem Thema hochladen und eintragen. */
export async function themavideoHochladen(d: {
  themaId: string;
  titel: string;
  datei: File;
  dauer: number | null;
  onFortschritt?: (anteil: number) => void;
  abbruch?: { aktuell: (() => void) | null };
}): Promise<void> {
  const endung = videoEndung(d.datei);
  const pfad = `thema-${d.themaId}/${dateiName(endung)}`;
  await webHochladen({
    bucket: ERKLAER_BUCKET,
    pfad,
    datei: d.datei,
    typ: endung === "mov" ? "video/quicktime" : "video/mp4",
    onFortschritt: d.onFortschritt,
    abbruch: d.abbruch,
  });
  const { error } = await supabase.rpc("lern_themavideo_hinzufuegen", { p_thema: d.themaId, p_titel: d.titel, p_pfad: pfad, p_dauer: d.dauer });
  if (error) {
    await supabase.storage.from(ERKLAER_BUCKET).remove([pfad]).catch(() => {});
    throw new Error(meldung(error));
  }
  await themenvideosLaden(true);
}

export async function themavideoUmbenennen(id: string, titel: string): Promise<void> {
  const { error } = await supabase.rpc("lern_themavideo_umbenennen", { p_id: id, p_titel: titel });
  if (error) throw new Error(meldung(error));
  setzen({ geladen: true, videos: stand.videos.map((v) => (v.id === id ? { ...v, titel: titel.trim() } : v)) });
}

export async function themavideoVerschieben(id: string, richtung: -1 | 1): Promise<void> {
  const { error } = await supabase.rpc("lern_themavideo_verschieben", { p_id: id, p_richtung: richtung });
  if (error) throw new Error(meldung(error));
  await themenvideosLaden(true);
}

/** Inhaber: Video löschen (Eintrag und Datei). */
export async function themavideoLoeschen(id: string): Promise<void> {
  const { data: pfad, error } = await supabase.rpc("lern_themavideo_loeschen", { p_id: id });
  if (error) throw new Error(meldung(error));
  if (typeof pfad === "string" && pfad) await supabase.storage.from(ERKLAER_BUCKET).remove([pfad]).catch(() => {});
  setzen({ geladen: true, videos: stand.videos.filter((v) => v.id !== id) });
}
