import { useEffect, useMemo, useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useKonto } from "./konto";
import { useLernthemen, type Lernthema } from "./lernthemen";
import { serverVerbunden, supabase } from "./supabase";
import { useThemenvideos, type Themavideo } from "./themenvideos";

/**
 * Videokurse (Coach): Kurse sind die Themen aus dem Manager, gegliedert in
 * Kapitel. Wie weit man ein Video geschaut hat, merkt sich das Gerät (für
 * „Weiterlernen“ und „Noch x Min.“). Ganz gesehene Videos meldet die App dem
 * Server – daraus entstehen der Fortschritt im Kurs und die Zahl der Lernenden
 * (SQL Abschnitt 31).
 */

export type KursVideo = Themavideo;
export type Kapitel = { titel: string; videos: KursVideo[] };
export type Kurs = {
  thema: Lernthema;
  videos: KursVideo[];
  kapitel: Kapitel[];
  /** Gesamtlänge in Sekunden. */
  dauer: number;
  lernende: number;
  gesehen: number;
};

// ---------------------------------------------------------------- Fortschritt (Gerät + Server)

type Fortschritt = { videos: Record<string, { sek: number; dauer: number; am: string; fertig?: boolean }> };
const SPEICHER = "spur-kurs-fortschritt-v1";

let fortschritt: Fortschritt = { videos: {} };
let gesehenServer = new Set<string>();
let lernende: Record<string, number> = {};
let geladen = false;
const hoerer = new Set<() => void>();
let version = 0;
const melden = () => {
  version += 1;
  hoerer.forEach((h) => h());
};

async function lokalLaden() {
  try {
    const roh = await AsyncStorage.getItem(SPEICHER);
    if (roh) fortschritt = JSON.parse(roh) as Fortschritt;
  } catch {
    // leer lassen
  }
}

async function serverLaden(angemeldet: boolean) {
  if (!serverVerbunden) return;
  try {
    const { data } = await supabase.rpc("lern_kurse_lernende");
    lernende = Object.fromEntries(((data ?? []) as { thema_id: string; lernende: number }[]).map((z) => [z.thema_id, z.lernende]));
  } catch {
    // ohne SQL-Update: keine Zahlen
  }
  if (!angemeldet) return;
  try {
    const { data } = await supabase.from("lern_kurs_gesehen").select("video_id");
    gesehenServer = new Set(((data ?? []) as { video_id: string }[]).map((z) => z.video_id));
  } catch {
    // ohne SQL-Update
  }
}

function speichern() {
  AsyncStorage.setItem(SPEICHER, JSON.stringify(fortschritt)).catch(() => {});
}

/** Während des Abspielens: Stelle merken. Ab 90 % gilt das Video als gesehen. */
export function videoStelleMerken(id: string, sek: number, dauer: number) {
  if (!dauer || !isFinite(dauer)) return;
  const alt = fortschritt.videos[id];
  const fertig = alt?.fertig || sek >= dauer * 0.9;
  fortschritt = { videos: { ...fortschritt.videos, [id]: { sek: fertig ? 0 : sek, dauer, am: new Date().toISOString(), fertig } } };
  speichern();
  if (fertig && !alt?.fertig) {
    gesehenServer.add(id);
    if (serverVerbunden) Promise.resolve(supabase.rpc("lern_kurs_video_gesehen", { p_video: id })).catch(() => {});
  }
  melden();
}

export function istGesehen(id: string): boolean {
  return Boolean(fortschritt.videos[id]?.fertig) || gesehenServer.has(id);
}

/** Restzeit eines angefangenen Videos in Sekunden (oder null). */
export function restVon(id: string): number | null {
  const f = fortschritt.videos[id];
  if (!f || f.fertig || f.sek < 3) return null;
  return Math.max(0, f.dauer - f.sek);
}

export function stelleVon(id: string): number {
  const f = fortschritt.videos[id];
  return f && !f.fertig ? f.sek : 0;
}

function useFortschrittVersion(): number {
  return useSyncExternalStore(
    (h) => {
      hoerer.add(h);
      return () => hoerer.delete(h);
    },
    () => version,
  );
}

// ---------------------------------------------------------------- Kurse

function kapitelVon(videos: KursVideo[]): Kapitel[] {
  const liste: Kapitel[] = [];
  for (const v of videos) {
    const titel = v.kapitel.trim();
    const letztes = liste[liste.length - 1];
    if (letztes && letztes.titel === titel) letztes.videos.push(v);
    else liste.push({ titel, videos: [v] });
  }
  return liste;
}

/** Alle Kurse mit Kapiteln, Dauer, Lernenden und eigenem Fortschritt. */
export function useKurse(): { geladen: boolean; kurse: Kurs[] } {
  const themen = useLernthemen();
  const { geladen: videosGeladen, videos } = useThemenvideos();
  const { session } = useKonto();
  const v = useFortschrittVersion();

  useEffect(() => {
    let aktiv = true;
    (async () => {
      if (!geladen) {
        geladen = true;
        await lokalLaden();
      }
      await serverLaden(Boolean(session));
      if (aktiv) melden();
    })();
    return () => {
      aktiv = false;
    };
  }, [session]);

  return useMemo(() => {
    const kurse = themen.themen.map((t) => {
      const eigene = videos.filter((x) => x.thema_id === t.id);
      return {
        thema: t,
        videos: eigene,
        kapitel: kapitelVon(eigene),
        dauer: eigene.reduce((s, x) => s + (x.dauer ?? 0), 0),
        lernende: lernende[t.id] ?? 0,
        gesehen: eigene.filter((x) => istGesehen(x.id)).length,
      };
    });
    return { geladen: themen.geladen && videosGeladen, kurse };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themen, videos, v]);
}

/** Zuletzt angefangenes Video (für „Weiterlernen“) – sonst das nächste offene im zuletzt genutzten Kurs. */
export function weiterlernen(kurse: Kurs[]): { kurs: Kurs; video: KursVideo; rest: number | null } | null {
  let bestes: { kurs: Kurs; video: KursVideo; am: string } | null = null;
  for (const k of kurse)
    for (const x of k.videos) {
      const f = fortschritt.videos[x.id];
      if (f && (!bestes || f.am > bestes.am)) bestes = { kurs: k, video: x, am: f.am };
    }
  if (bestes) {
    if (!istGesehen(bestes.video.id)) return { kurs: bestes.kurs, video: bestes.video, rest: restVon(bestes.video.id) };
    const naechstes = bestes.kurs.videos.find((x) => !istGesehen(x.id));
    if (naechstes) return { kurs: bestes.kurs, video: naechstes, rest: null };
  }
  const erster = kurse.find((k) => k.videos.length);
  return erster ? { kurs: erster, video: erster.videos.find((x) => !istGesehen(x.id)) ?? erster.videos[0], rest: null } : null;
}

/** Lern-Aktivität aus dem Video-Fortschritt: Tage mit Videos, gelernte Sekunden, letzte Nutzung je Video. */
export function lernAktivitaet(): { tage: Set<string>; sekunden: number; zuletzt: (id: string) => string | null } {
  const tage = new Set<string>();
  let sekunden = 0;
  for (const f of Object.values(fortschritt.videos)) {
    const d = new Date(f.am);
    if (!Number.isNaN(d.getTime())) tage.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    sekunden += f.fertig ? f.dauer || f.sek : f.sek;
  }
  return { tage, sekunden, zuletzt: (id) => fortschritt.videos[id]?.am ?? null };
}

/** „1 Std. 22 Min.“, „38 Min.“ */
export function dauerLang(sek: number): string {
  const min = Math.max(1, Math.round(sek / 60));
  if (min < 60) return `${min} Min.`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return r ? `${h} Std. ${r} Min.` : `${h} Std.`;
}
