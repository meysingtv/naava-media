import { useEffect, useSyncExternalStore } from "react";
import type { ImageSourcePropType } from "react-native";

import { FOTOS } from "./fotos";
import { kanalName } from "./live";
import { serverVerbunden, supabase } from "./supabase";
import { ERKLAER_BUCKET } from "./erklaervideos";
import { themenvideosLaden } from "./themenvideos";

/**
 * Themen der Lernvideos (SQL Abschnitt 30). Der Inhaber legt sie im Manager an
 * – Titel, kurze Beschreibung, eigenes Bild, Reihenfolge – und lädt dort zu
 * jedem Thema die Videos hoch. App und Website zeigen genau diese Themen.
 */

export type Lernthema = {
  id: string;
  titel: string;
  kurz: string;
  bild_pfad: string | null;
  position: number;
  /** Kategorie des Videokurses (SQL Abschnitt 31); ohne Update „theorie“. */
  kategorie: Kategorie;
};

export type Kategorie = "theorie" | "praxis" | "kurzvideos" | "technik";

export const KATEGORIEN: { id: Kategorie; titel: string }[] = [
  { id: "theorie", titel: "Theorie" },
  { id: "praxis", titel: "Praxis" },
  { id: "kurzvideos", titel: "Kurzvideos" },
  { id: "technik", titel: "Technik" },
];

export const THEMENBILD_BUCKET = "lern-themenbilder";

type Stand = { geladen: boolean; themen: Lernthema[] };

let stand: Stand = { geladen: false, themen: [] };
let laedt: Promise<void> | null = null;
const hoerer = new Set<() => void>();
let kanal: ReturnType<typeof supabase.channel> | null = null;

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
  if (/nur für den inhaber|row-level security/i.test(text)) return "Themen kann nur der Inhaber verwalten.";
  if (/lern_thema|schema cache|could not find the function/i.test(text)) return "Das SQL-Update für eigene Themen fehlt noch (supabase/update-themen.sql, Abschnitt 30).";
  if (/network|fetch/i.test(text)) return "Keine Verbindung. Bitte prüfe dein Internet.";
  return text;
}

/** Liste vom Server holen. `neu` lädt auch dann, wenn schon geladen. */
export function lernthemenLaden(neu = false): Promise<void> {
  if (!serverVerbunden) {
    if (!stand.geladen) setzen({ geladen: true, themen: [] });
    return Promise.resolve();
  }
  if (laedt) return laedt;
  if (stand.geladen && !neu) return Promise.resolve();
  laedt = (async () => {
    try {
      // Mit Kategorie (Abschnitt 31); fehlt das Update noch, ohne.
      let antwort = await supabase.from("lern_thema").select("id, titel, kurz, bild_pfad, position, kategorie").order("position").order("erstellt_am");
      if (antwort.error) antwort = (await supabase.from("lern_thema").select("id, titel, kurz, bild_pfad, position").order("position").order("erstellt_am")) as typeof antwort;
      if (antwort.error) throw antwort.error;
      setzen({ geladen: true, themen: ((antwort.data ?? []) as Partial<Lernthema>[]).map((t) => ({ ...t, kategorie: (t.kategorie ?? "theorie") as Kategorie }) as Lernthema) });
    } catch {
      // Ohne Netz oder ohne SQL-Update: einfach keine Themen
      if (!stand.geladen) setzen({ geladen: true, themen: [] });
    } finally {
      laedt = null;
    }
  })();
  return laedt;
}

/** Änderungen im Manager kommen ohne Neustart in App und Website an. */
function liveAbonnieren() {
  if (kanal || !serverVerbunden) return;
  kanal = supabase
    .channel(kanalName("lern-themen"))
    .on("postgres_changes", { event: "*", schema: "public", table: "lern_thema" }, () => {
      lernthemenLaden(true);
    })
    .subscribe();
}

/** Alle Themen in ihrer Reihenfolge. Lädt beim ersten Gebrauch. */
export function useLernthemen(): Stand {
  const s = useSyncExternalStore(abonnieren, () => stand);
  useEffect(() => {
    if (!s.geladen) lernthemenLaden();
    liveAbonnieren();
  }, [s.geladen]);
  return s;
}

/** Ein Thema über seine Kennung (null, solange geladen wird oder wenn es fehlt). */
export function useLernthema(id: string | undefined): { geladen: boolean; thema: Lernthema | null } {
  const { geladen, themen } = useLernthemen();
  return { geladen, thema: themen.find((t) => t.id === id) ?? null };
}

/** Straßenfotos als Ersatz, solange ein Thema kein eigenes Bild hat – je Thema fest gewählt. */
const ERSATZ = [FOTOS.strasse1, FOTOS.strasse2, FOTOS.strasse3, FOTOS.baeume, FOTOS.grundstoff, FOTOS.lernen];

export function themaBild(t: Pick<Lernthema, "id" | "bild_pfad"> | null | undefined): ImageSourcePropType {
  if (t?.bild_pfad) return { uri: supabase.storage.from(THEMENBILD_BUCKET).getPublicUrl(t.bild_pfad).data.publicUrl };
  const id = t?.id ?? "";
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ERSATZ[h % ERSATZ.length];
}

// ---------------------------------------------------------------------------
// Verwaltung (Inhaber, Web-Panel)
// ---------------------------------------------------------------------------

export async function lernthemaAnlegen(titel: string, kurz: string): Promise<string> {
  const { data, error } = await supabase.rpc("lern_thema_anlegen", { p_titel: titel, p_kurz: kurz });
  if (error) throw new Error(meldung(error));
  await lernthemenLaden(true);
  return data as string;
}

export async function lernthemaAendern(id: string, titel: string, kurz: string): Promise<void> {
  const { error } = await supabase.rpc("lern_thema_aendern", { p_id: id, p_titel: titel, p_kurz: kurz });
  if (error) throw new Error(meldung(error));
  await lernthemenLaden(true);
}

export async function lernthemaKategorie(id: string, kategorie: Kategorie): Promise<void> {
  const { error } = await supabase.rpc("lern_thema_kategorie_setzen", { p_id: id, p_kategorie: kategorie });
  if (error) throw new Error(/function|schema cache/i.test(error.message) ? "Das SQL-Update für Videokurse fehlt noch (supabase/update-kurse.sql, Abschnitt 31)." : meldung(error));
  await lernthemenLaden(true);
}

export async function lernthemaVerschieben(id: string, richtung: -1 | 1): Promise<void> {
  const { error } = await supabase.rpc("lern_thema_verschieben", { p_id: id, p_richtung: richtung });
  if (error) throw new Error(meldung(error));
  await lernthemenLaden(true);
}

const BILD_TYPEN: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Prüft ein Bild vor dem Hochladen (JPG, PNG oder WebP, höchstens 5 MB). */
export function themenbildPruefen(datei: { type: string; size: number }): string | null {
  if (!BILD_TYPEN[datei.type]) return "Bitte ein Bild als JPG, PNG oder WebP auswählen.";
  if (datei.size > 5 * 1024 * 1024) return "Das Bild ist größer als 5 MB. Bitte verkleinern.";
  return null;
}

/** Bild hochladen und eintragen; das alte Bild wird gelöscht. */
export async function lernthemaBildHochladen(id: string, datei: Blob & { type: string; size: number }): Promise<void> {
  const problem = themenbildPruefen(datei);
  if (problem) throw new Error(problem);
  const zufall = Math.random().toString(36).slice(2, 10);
  const pfad = `${id}/${Date.now().toString(36)}${zufall}.${BILD_TYPEN[datei.type]}`;
  const { error: hochFehler } = await supabase.storage.from(THEMENBILD_BUCKET).upload(pfad, datei, { contentType: datei.type, upsert: false });
  if (hochFehler) throw new Error(meldung(hochFehler));
  const { data: alt, error } = await supabase.rpc("lern_thema_bild_setzen", { p_id: id, p_pfad: pfad });
  if (error) {
    await supabase.storage.from(THEMENBILD_BUCKET).remove([pfad]).catch(() => {});
    throw new Error(meldung(error));
  }
  if (typeof alt === "string" && alt) await supabase.storage.from(THEMENBILD_BUCKET).remove([alt]).catch(() => {});
  await lernthemenLaden(true);
}

/** Bild entfernen (das Thema zeigt dann wieder ein Straßenfoto). */
export async function lernthemaBildEntfernen(id: string): Promise<void> {
  const { data: alt, error } = await supabase.rpc("lern_thema_bild_setzen", { p_id: id, p_pfad: null });
  if (error) throw new Error(meldung(error));
  if (typeof alt === "string" && alt) await supabase.storage.from(THEMENBILD_BUCKET).remove([alt]).catch(() => {});
  await lernthemenLaden(true);
}

/** Thema mit allen Videos löschen (Einträge und Dateien). */
export async function lernthemaLoeschen(id: string): Promise<void> {
  const { data, error } = await supabase.rpc("lern_thema_loeschen", { p_id: id });
  if (error) throw new Error(meldung(error));
  const d = (data ?? {}) as { bild?: string | null; videos?: string[] };
  if (d.bild) await supabase.storage.from(THEMENBILD_BUCKET).remove([d.bild]).catch(() => {});
  if (d.videos?.length) await supabase.storage.from(ERKLAER_BUCKET).remove(d.videos).catch(() => {});
  await Promise.all([lernthemenLaden(true), themenvideosLaden(true)]);
}
