import { useEffect, useSyncExternalStore } from "react";
import * as FileSystem from "expo-file-system/legacy";
import * as VideoThumbnails from "expo-video-thumbnails";

import { useKonto } from "./konto";
import { serverAdresse, serverSchluessel, serverVerbunden, supabase } from "./supabase";

/**
 * Clips: kurze Videos wie bei TikTok. Ansehen geht für alle, Liken,
 * Kommentieren und Folgen mit Konto. Hochladen darf der Inhaber der App und
 * wen er in den Einstellungen freischaltet – geprüft wird das auf dem Server.
 */

export const CLIP_BUCKET = "lern-clips";
/** Obergrenze je Datei im kostenlosen Supabase-Tarif. */
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export type FeedArt = "entdecken" | "folge_ich";

export type ClipEintrag = {
  id: string;
  titel: string;
  beschreibung: string;
  video_pfad: string;
  bild_pfad: string | null;
  breite: number | null;
  hoehe: number | null;
  dauer: number | null;
  likes: number;
  kommentare: number;
  geteilt: number;
  erstellt_am: string;
  autor: string;
  autor_name: string;
  autor_benutzername: string;
  autor_farbe: string;
  autor_bild: string | null;
  gemocht: boolean;
  folge_ich: boolean;
};

export type Kommentar = {
  id: string;
  /** Oberster Kommentar, auf den geantwortet wurde (null = selbst oben). */
  antwort_auf: string | null;
  inhalt: string;
  erstellt_am: string;
  autor: string;
  autor_name: string;
  autor_benutzername: string;
  autor_farbe: string;
  autor_bild: string | null;
  loeschbar: boolean;
  likes: number;
  gemocht: boolean;
  /** Anzahl je Emoji, z. B. { "😂": 3 }. */
  reaktionen: Record<string, number>;
  meine_reaktion: string | null;
};

/** Feste Auswahl für Reaktionen – identisch mit der Prüfung auf dem Server. */
export const REAKTIONEN = ["👍", "❤️", "😂", "😮", "🔥", "👏"] as const;

export type Ersteller = { id: string; name: string; benutzername: string; avatar_farbe: string; bild_pfad: string | null; hinzugefuegt_am: string };

function meldung(fehler: unknown): string {
  const text = fehler instanceof Error ? fehler.message : typeof fehler === "object" && fehler && "message" in fehler ? String((fehler as { message: unknown }).message) : String(fehler);
  if (/network|fetch|internet/i.test(text)) return "Keine Verbindung. Bitte prüfe dein Internet.";
  if (/nicht angemeldet|jwt|not authenticated/i.test(text)) return "Bitte melde dich an.";
  if (/row-level security|unauthorized|berechtigung/i.test(text)) return "Dafür fehlt dir die Berechtigung.";
  if (/payload too large|exceeded the maximum|too large|413/i.test(text)) return "Das Video ist zu groß (höchstens 50 MB). Kürze es etwas.";
  if (/mime|invalid_mime_type/i.test(text)) return "Dieses Videoformat wird nicht unterstützt.";
  return text;
}

/** Öffentliche Adresse einer Datei (Video oder Vorschaubild) – schnell über das CDN. */
export function dateiUrl(pfad: string): string {
  return supabase.storage.from(CLIP_BUCKET).getPublicUrl(pfad).data.publicUrl;
}

// ---------------------------------------------------------------------------
// Feed, Likes, Folgen, Teilen, Melden, Löschen
// ---------------------------------------------------------------------------

export async function feedLaden(art: FeedArt, vor: string | null, anzahl = 8): Promise<ClipEintrag[]> {
  const { data, error } = await supabase.rpc("lern_clip_feed", { p_art: art, p_vor: vor, p_anzahl: anzahl });
  if (error) throw new Error(meldung(error));
  return (data ?? []) as ClipEintrag[];
}

export type ErstellerProfil = {
  id: string;
  name: string;
  benutzername: string;
  avatar_farbe: string;
  bild_pfad: string | null;
  clips: number;
  follower: number;
  folgt: number;
  likes: number;
  folge_ich: boolean;
  ich: boolean;
};

export async function erstellerProfilLaden(nutzer: string): Promise<ErstellerProfil | null> {
  const { data, error } = await supabase.rpc("lern_ersteller_profil", { p_nutzer: nutzer });
  if (error) throw new Error(meldung(error));
  const zeile = (Array.isArray(data) ? data[0] : data) as ErstellerProfil | undefined;
  return zeile ?? null;
}

/** Alle Clips einer Person, neueste zuerst. */
export async function clipsVonLaden(nutzer: string, vor: string | null = null, anzahl = 30): Promise<ClipEintrag[]> {
  const { data, error } = await supabase.rpc("lern_clips_von", { p_nutzer: nutzer, p_vor: vor, p_anzahl: anzahl });
  if (error) throw new Error(meldung(error));
  return (data ?? []) as ClipEintrag[];
}

export async function likeSetzen(clip: string, an: boolean): Promise<number> {
  const { data, error } = await supabase.rpc("lern_clip_liken", { p_clip: clip, p_an: an });
  if (error) throw new Error(meldung(error));
  return Number(data ?? 0);
}

export async function folgenSetzen(nutzer: string, an: boolean): Promise<void> {
  const { error } = await supabase.rpc("lern_folgen_setzen", { p_nutzer: nutzer, p_an: an });
  if (error) throw new Error(meldung(error));
}

export async function geteiltMelden(clip: string): Promise<number | null> {
  const { data, error } = await supabase.rpc("lern_clip_geteilt", { p_clip: clip });
  return error ? null : Number(data ?? 0);
}

export async function clipMelden(clip: string, grund: string): Promise<void> {
  const { error } = await supabase.rpc("lern_clip_melden", { p_clip: clip, p_grund: grund });
  if (error) throw new Error(meldung(error));
}

export async function clipLoeschen(clip: ClipEintrag): Promise<void> {
  const { error } = await supabase.rpc("lern_clip_loeschen", { p_clip: clip.id });
  if (error) throw new Error(meldung(error));
  const dateien = [clip.video_pfad, ...(clip.bild_pfad ? [clip.bild_pfad] : [])];
  await supabase.storage.from(CLIP_BUCKET).remove(dateien);
}

// ---------------------------------------------------------------------------
// Kommentare
// ---------------------------------------------------------------------------

export async function kommentareLaden(clip: string): Promise<Kommentar[]> {
  const { data, error } = await supabase.rpc("lern_clip_kommentare", { p_clip: clip, p_vor: null });
  if (error) throw new Error(meldung(error));
  return (data ?? []) as Kommentar[];
}

export async function kommentieren(clip: string, inhalt: string, antwortAuf: string | null = null): Promise<void> {
  const { error } = await supabase.rpc("lern_clip_kommentieren", { p_clip: clip, p_inhalt: inhalt, p_antwort_auf: antwortAuf });
  if (error) throw new Error(meldung(error));
}

/** Löscht einen Kommentar samt Antworten; liefert, wie viele es insgesamt waren. */
export async function kommentarLoeschen(id: string): Promise<number> {
  const { data, error } = await supabase.rpc("lern_clip_kommentar_loeschen", { p_id: id });
  if (error) throw new Error(meldung(error));
  return Number(data ?? 1);
}

export async function kommentarLiken(id: string, an: boolean): Promise<number> {
  const { data, error } = await supabase.rpc("lern_kommentar_liken", { p_kommentar: id, p_an: an });
  if (error) throw new Error(meldung(error));
  return Number(data ?? 0);
}

/** Reaktion setzen (null entfernt sie); liefert die neuen Zahlen je Emoji. */
export async function kommentarReagieren(id: string, emoji: string | null): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc("lern_kommentar_reagieren", { p_kommentar: id, p_emoji: emoji });
  if (error) throw new Error(meldung(error));
  return (data ?? {}) as Record<string, number>;
}

// ---------------------------------------------------------------------------
// Rechte: Inhaber / Ersteller
// ---------------------------------------------------------------------------

export type ClipRechte = { inhaber: boolean; ersteller: boolean };
const KEINE: ClipRechte = { inhaber: false, ersteller: false };

let rechte: { fuer: string | null; wert: ClipRechte } = { fuer: null, wert: KEINE };
let laedtFuer: string | null = null;
const rechteHoerer = new Set<() => void>();

function rechteAbonnieren(h: () => void) {
  rechteHoerer.add(h);
  return () => rechteHoerer.delete(h);
}

async function rechteHolen(nutzer: string) {
  if (laedtFuer === nutzer) return;
  laedtFuer = nutzer;
  const { data } = await supabase.rpc("lern_clip_rechte");
  laedtFuer = null;
  const zeile = (Array.isArray(data) ? data[0] : data) as Partial<ClipRechte> | null;
  rechte = { fuer: nutzer, wert: { inhaber: Boolean(zeile?.inhaber), ersteller: Boolean(zeile?.ersteller) } };
  rechteHoerer.forEach((h) => h());
}

/** Darf der angemeldete Nutzer Clips hochladen bzw. Ersteller verwalten? */
export function useClipRechte(): ClipRechte {
  const { session } = useKonto();
  const nutzer = session?.user.id ?? null;
  const stand = useSyncExternalStore(rechteAbonnieren, () => rechte);
  useEffect(() => {
    if (nutzer && serverVerbunden && stand.fuer !== nutzer) rechteHolen(nutzer);
  }, [nutzer, stand.fuer]);
  return nutzer && stand.fuer === nutzer ? stand.wert : KEINE;
}

// ---------------------------------------------------------------------------
// Inhaber: Ersteller verwalten
// ---------------------------------------------------------------------------

export async function erstellerListe(): Promise<Ersteller[]> {
  const { data, error } = await supabase.rpc("lern_clip_ersteller_liste");
  if (error) throw new Error(meldung(error));
  return (data ?? []) as Ersteller[];
}

export async function erstellerHinzufuegen(kennung: string): Promise<void> {
  const { error } = await supabase.rpc("lern_clip_ersteller_hinzufuegen", { p_kennung: kennung.trim() });
  if (error) throw new Error(meldung(error));
}

export async function erstellerEntfernen(id: string): Promise<void> {
  const { error } = await supabase.rpc("lern_clip_ersteller_entfernen", { p_id: id });
  if (error) throw new Error(meldung(error));
}

// ---------------------------------------------------------------------------
// Hochladen – das Video wird von der Platte gestreamt (kein Speicherhunger)
// ---------------------------------------------------------------------------

const neuHoerer = new Set<() => void>();

/** Wird aufgerufen, wenn ein Clip hochgeladen oder gelöscht wurde. */
export function beiNeuenClips(h: () => void) {
  neuHoerer.add(h);
  return () => {
    neuHoerer.delete(h);
  };
}

/** Datei direkt von der Platte in einen Speicher-Bucket laden (gestreamt). */
export async function dateiHochladen(
  bucket: string,
  uri: string,
  pfad: string,
  typ: string,
  token: string,
  onFortschritt?: (anteil: number) => void,
  abbruch?: { aktuell: (() => void) | null },
): Promise<void> {
  const aufgabe = FileSystem.createUploadTask(
    `${serverAdresse}/storage/v1/object/${bucket}/${pfad}`,
    uri,
    {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: serverSchluessel,
        "Content-Type": typ,
        "cache-control": "max-age=31536000",
        "x-upsert": "false",
      },
    },
    onFortschritt
      ? ({ totalBytesSent, totalBytesExpectedToSend }) => onFortschritt(totalBytesExpectedToSend > 0 ? totalBytesSent / totalBytesExpectedToSend : 0)
      : undefined,
  );
  if (abbruch) abbruch.aktuell = () => aufgabe.cancelAsync().catch(() => {});
  const antwort = await aufgabe.uploadAsync();
  if (abbruch) abbruch.aktuell = null;
  if (!antwort) throw new Error("Hochladen abgebrochen.");
  if (antwort.status >= 300) {
    let text = `Fehler ${antwort.status}`;
    try {
      const j = JSON.parse(antwort.body) as { message?: string; error?: string };
      text = j.message || j.error || text;
    } catch {
      // kein JSON
    }
    if (antwort.status === 413) text = "Payload too large";
    throw new Error(meldung(text));
  }
}

export async function clipHochladen(d: {
  videoUri: string;
  breite: number | null;
  hoehe: number | null;
  dauer: number | null;
  titel: string;
  beschreibung: string;
  onFortschritt?: (anteil: number) => void;
  abbruch?: { aktuell: (() => void) | null };
}): Promise<void> {
  if (!serverVerbunden) throw new Error("Die App ist noch mit keinem Server verbunden.");
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) throw new Error("Bitte melde dich an.");

  const mov = /\.mov$/i.test(d.videoUri);
  const basis = `${session.user.id}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const videoPfad = `${basis}.${mov ? "mov" : "mp4"}`;

  // Vorschaubild für einen sofortigen ersten Eindruck im Feed
  let bildPfad: string | null = null;
  try {
    const bild = await VideoThumbnails.getThumbnailAsync(d.videoUri, { time: 300, quality: 0.72 });
    await dateiHochladen(CLIP_BUCKET, bild.uri, `${basis}.jpg`, "image/jpeg", session.access_token);
    bildPfad = `${basis}.jpg`;
  } catch {
    bildPfad = null;
  }

  await dateiHochladen(CLIP_BUCKET, d.videoUri, videoPfad, mov ? "video/quicktime" : "video/mp4", session.access_token, d.onFortschritt, d.abbruch);

  const { error } = await supabase.rpc("lern_clip_anlegen", {
    p_video: videoPfad,
    p_bild: bildPfad,
    p_titel: d.titel.trim(),
    p_beschreibung: d.beschreibung.trim(),
    p_breite: d.breite ? Math.round(d.breite) : null,
    p_hoehe: d.hoehe ? Math.round(d.hoehe) : null,
    p_dauer: d.dauer,
  });
  if (error) {
    await supabase.storage
      .from(CLIP_BUCKET)
      .remove([videoPfad, ...(bildPfad ? [bildPfad] : [])])
      .catch(() => {});
    throw new Error(meldung(error));
  }
  neuHoerer.forEach((h) => h());
}

/** Nach dem Löschen eines Clips andere Ansichten informieren. */
export function clipsGeaendert() {
  neuHoerer.forEach((h) => h());
}

// ---------------------------------------------------------------------------
// Anzeige-Helfer
// ---------------------------------------------------------------------------

/** 1234 → „1,2K“, 2500000 → „2,5 Mio.“ – wie bei TikTok. */
export function kurzeZahl(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",").replace(",0", "")} Mio.`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(".", ",").replace(",0", "")}K`;
  return String(n);
}

/** „gerade eben“, „vor 5 Min.“, „vor 3 Std.“, „vor 2 Tagen“, sonst Datum. */
export function vorZeit(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "gerade eben";
  if (s < 3600) return `vor ${Math.floor(s / 60)} Min.`;
  if (s < 86400) return `vor ${Math.floor(s / 3600)} Std.`;
  const tage = Math.floor(s / 86400);
  if (tage < 7) return tage === 1 ? "gestern" : `vor ${tage} Tagen`;
  const d = new Date(iso);
  return `${d.getDate()}.${d.getMonth() + 1}.${String(d.getFullYear()).slice(2)}`;
}
