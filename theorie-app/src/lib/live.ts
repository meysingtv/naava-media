import { useEffect, useState } from "react";
import { AppState, Platform } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { pushEinrichten } from "@/lib/crew";
import type { LiveRad } from "@/lib/live-rad";
import type { LiveTafel } from "@/lib/live-tafel";
import { uhrStellen } from "@/lib/server-uhr";
import { serverVerbunden, supabase } from "@/lib/supabase";

// Live-Stream in Clips: Nur der Inhaber der App geht live, alle anderen schauen
// zu und schreiben im Chat. Bild und Ton laufen über LiveKit (Zugang von der
// Edge Function live-token), Status und Chat über Supabase (SQL Abschnitt 17).

export type LiveInfo = {
  id: string;
  titel: string;
  gestartet_am: string;
  gastgeber: { id: string; name: string; bild_pfad: string | null; avatar_farbe: string } | null;
  /** Bild aus der Galerie des Gastgebers (Lage in Anteilen des Videos). */
  bild?: { pfad: string; seite: number; x: number; y: number; groesse: number } | null;
  /** Themenrad, das gerade dreht oder steht. */
  rad?: LiveRad | null;
  /** Tafel des Gastgebers (Hintergrund und Striche). */
  tafel?: LiveTafel | null;
};

export type ChatNachricht = {
  id: number;
  user_id: string;
  name: string;
  bild_pfad: string | null;
  text: string;
  erstellt_am: string;
  geloescht: boolean;
};

/** Steuerung der laufenden Verbindung (nur in der App, nicht im Web). */
export type LiveSteuerung = {
  herz: () => void;
  kameraWechseln: () => Promise<void>;
  mikrofon: (an: boolean) => Promise<void>;
  /** Gastgeber: allen sagen, dass sich beim Quiz oder der Prüfung etwas geändert hat. */
  quiz: () => void;
  /** Gastgeber: Bild-Lage an alle (`zuverlaessig` für Anfang und Ende einer Bewegung). */
  bild: (nachricht: string, zuverlaessig: boolean) => void;
  /** Gastgeber: Tafel-Nachricht an alle (Strich, Rückgängig, …). */
  tafel: (nachricht: string) => void;
};

export type LiveVerbindung = "verbindet" | "verbunden" | "getrennt" | "fehler";

export type LiveBuehneProps = {
  url: string;
  token: string;
  /** Inhaber: Kamera und Mikrofon senden. */
  senden: boolean;
  /** Zuschauer: Ton aus (wie der Ton-Knopf in Clips). */
  stumm?: boolean;
  onVerbindung?: (status: LiveVerbindung, meldung?: string) => void;
  onZuschauer?: (anzahl: number) => void;
  /** Jemand hat ein Herz geschickt. */
  onHerz?: () => void;
  /** Zuschauer: Bild des Gastgebers fehlt gerade (Pause oder weg). */
  onBildWeg?: (weg: boolean) => void;
  /** Zuschauer: Der Gastgeber hat beim Quiz oder der Prüfung etwas geändert. */
  onQuiz?: () => void;
  /** Zuschauer: neue Lage des Bilds vom Gastgeber (Text aus live-bild). */
  onBild?: (nachricht: string) => void;
  /** Zuschauer: Tafel-Nachricht vom Gastgeber (Text aus live-tafel). */
  onTafel?: (nachricht: string) => void;
  onSteuerung?: (s: LiveSteuerung | null) => void;
  style?: StyleProp<ViewStyle>;
};

export function meldung(fehler: unknown): string {
  const text = fehler instanceof Error ? fehler.message : typeof fehler === "object" && fehler && "message" in fehler ? String((fehler as { message: unknown }).message) : String(fehler);
  if (/network|fetch|internet/i.test(text)) return "Keine Verbindung. Bitte prüfe dein Internet.";
  if (/nicht angemeldet|jwt|not authenticated/i.test(text)) return "Bitte melde dich an.";
  return text;
}

// ---------------------------------------------------------------------------
// Läuft gerade ein Live? – ein gemeinsamer Stand für die ganze App
// ---------------------------------------------------------------------------

/** Eindeutiger Kanalname: Supabase gibt bei gleichem Namen den schon laufenden Kanal
 *  zurück – ein zweites Abo darauf (z. B. Clips im Hintergrund + Sende-Seite) stürzt ab. */
export const kanalName = (basis: string) => `${basis}-${Math.random().toString(36).slice(2, 10)}`;

let aktuell: LiveInfo | null = null;
let geladen = false;
const hoerer = new Set<() => void>();
let nutzer = 0;
let aufraeumen: (() => void) | null = null;

async function aktuellLaden() {
  if (serverVerbunden) {
    const vorher = Date.now();
    const { data, error } = await supabase.rpc("lern_live_aktuell");
    // Bei Fehlern (kein Netz, SQL noch nicht eingespielt) bleibt der letzte Stand.
    if (!error) {
      const neu = (data ?? null) as (LiveInfo & { jetzt?: string }) | null;
      uhrStellen(neu?.jetzt, vorher, Date.now());
      aktuell = neu?.id ? neu : null;
    }
  }
  geladen = true;
  hoerer.forEach((h) => h());
}

/** Startet Abfrage und Echtzeit-Abo, solange irgendwo in der App jemand zuhört. */
function beobachten() {
  nutzer += 1;
  if (nutzer > 1 || !serverVerbunden) return;
  aktuellLaden();
  const kanal = supabase
    .channel(kanalName("live-status"))
    .on("postgres_changes", { event: "*", schema: "public", table: "lern_live" }, () => aktuellLaden())
    .subscribe();
  // Falls Echtzeit nicht durchkommt: jede Minute nachsehen, solange die App offen ist.
  const takt = setInterval(() => {
    if (AppState.currentState === "active") aktuellLaden();
  }, 60_000);
  const vorne = AppState.addEventListener("change", (s) => s === "active" && aktuellLaden());
  aufraeumen = () => {
    clearInterval(takt);
    vorne.remove();
    supabase.removeChannel(kanal);
  };
}

function nichtMehrBeobachten() {
  nutzer = Math.max(0, nutzer - 1);
  if (nutzer === 0) {
    aufraeumen?.();
    aufraeumen = null;
  }
}

/** Das gerade laufende Live (oder null) – aktualisiert sich von selbst. */
export function useLive(): { live: LiveInfo | null; geladen: boolean; neuLaden: () => Promise<void> } {
  const [, setZaehler] = useState(0);
  useEffect(() => {
    const h = () => setZaehler((z) => z + 1);
    hoerer.add(h);
    beobachten();
    return () => {
      hoerer.delete(h);
      nichtMehrBeobachten();
    };
  }, []);
  return { live: aktuell, geladen, neuLaden: aktuellLaden };
}

// ---------------------------------------------------------------------------
// Zugang zu LiveKit (Edge Function live-token)
// ---------------------------------------------------------------------------

export type LiveZugang = { url: string; token: string; live: string };
export type ZugangFehler = "nicht_eingerichtet" | "kein_live" | "anmelden" | "kein_inhaber" | "verbindung";

export async function liveZugang(rolle: "zuschauen" | "senden"): Promise<LiveZugang | { fehler: ZugangFehler }> {
  if (!serverVerbunden) return { fehler: "nicht_eingerichtet" };
  try {
    const { data, error } = await supabase.functions.invoke<LiveZugang>("live-token", { body: { rolle } });
    if (error) {
      const antwort = (error as { context?: Response }).context;
      const status = antwort?.status;
      let grund: string | undefined;
      try {
        grund = ((await antwort?.json()) as { fehler?: string } | undefined)?.fehler;
      } catch {
        grund = undefined;
      }
      if (grund === "kein_live" || grund === "anmelden" || grund === "kein_inhaber" || grund === "nicht_eingerichtet") return { fehler: grund };
      // 404 ohne eigene Antwort: Funktion noch nicht bereitgestellt
      if (status === 404 || status === 503) return { fehler: "nicht_eingerichtet" };
      return { fehler: "verbindung" };
    }
    return data?.token ? data : { fehler: "verbindung" };
  } catch {
    return { fehler: "verbindung" };
  }
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

/** Die letzten Nachrichten eines Lives, live nachgeladen. */
export function useLiveChat(liveId: string | null): ChatNachricht[] {
  const [nachrichten, setNachrichten] = useState<ChatNachricht[]>([]);
  useEffect(() => {
    setNachrichten([]);
    if (!liveId || !serverVerbunden) return;
    let aktiv = true;
    const einfuegen = (n: ChatNachricht) =>
      setNachrichten((alt) => {
        if (n.geloescht) return alt.filter((m) => m.id !== n.id);
        if (alt.some((m) => m.id === n.id)) return alt.map((m) => (m.id === n.id ? n : m));
        return [...alt, n].sort((a, b) => a.id - b.id).slice(-80);
      });
    const kanal = supabase
      .channel(kanalName(`live-chat-${liveId}`))
      .on("postgres_changes", { event: "*", schema: "public", table: "lern_live_chat", filter: `live_id=eq.${liveId}` }, (p) => {
        if (p.new && "id" in p.new) einfuegen(p.new as ChatNachricht);
      })
      .subscribe();
    supabase
      .from("lern_live_chat")
      .select("id, user_id, name, bild_pfad, text, erstellt_am, geloescht")
      .eq("live_id", liveId)
      .eq("geloescht", false)
      .order("id", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (!aktiv || !data) return;
        setNachrichten((alt) => {
          const da = new Set(alt.map((m) => m.id));
          return [...(data as ChatNachricht[]).filter((m) => !da.has(m.id)), ...alt].sort((a, b) => a.id - b.id).slice(-80);
        });
      });
    return () => {
      aktiv = false;
      supabase.removeChannel(kanal);
    };
  }, [liveId]);
  return nachrichten;
}

/** Nachricht schreiben – `null` bei Erfolg, sonst eine verständliche Meldung. */
export async function liveSchreiben(liveId: string, text: string): Promise<string | null> {
  const { error } = await supabase.rpc("lern_live_schreiben", { p_live: liveId, p_text: text });
  return error ? meldung(error) : null;
}

export async function liveNachrichtLoeschen(id: number): Promise<string | null> {
  const { error } = await supabase.rpc("lern_live_loeschen", { p_nachricht: id });
  return error ? meldung(error) : null;
}

export async function liveStummschalten(nutzerId: string, stumm: boolean): Promise<string | null> {
  const { error } = await supabase.rpc("lern_live_stummschalten", { p_nutzer: nutzerId, p_stumm: stumm });
  return error ? meldung(error) : null;
}

export async function liveMelden(id: number, grund: string): Promise<string | null> {
  const { error } = await supabase.rpc("lern_live_melden", { p_nachricht: id, p_grund: grund });
  return error ? meldung(error) : null;
}

// ---------------------------------------------------------------------------
// Mitteilung beim Live-Start (Zustimmung nach Apple-Regeln: nur auf Wunsch)
// ---------------------------------------------------------------------------

export async function liveAboStatus(): Promise<boolean> {
  if (!serverVerbunden) return false;
  const { data, error } = await supabase.rpc("lern_live_abo_status");
  return !error && data === true;
}

/**
 * Mitteilung an/aus. Beim Einschalten fragt das iPhone nach der Erlaubnis.
 * Ergebnis: der neue Stand, oder "keine_erlaubnis", wenn Mitteilungen aus sind.
 */
export async function liveAboSetzen(an: boolean): Promise<boolean | "keine_erlaubnis"> {
  if (an && Platform.OS !== "web") {
    const ok = await pushEinrichten(true);
    if (!ok) return "keine_erlaubnis";
  }
  const { error } = await supabase.rpc("lern_live_abo_setzen", { p_an: an });
  if (error) throw new Error(meldung(error));
  return an;
}

// ---------------------------------------------------------------------------
// Inhaber: senden
// ---------------------------------------------------------------------------

export async function liveVorbereiten(titel: string): Promise<{ id: string; raum: string }> {
  const { data, error } = await supabase.rpc("lern_live_vorbereiten", { p_titel: titel });
  if (error) throw new Error(meldung(error));
  return data as { id: string; raum: string };
}

export async function liveFreigeben(id: string, titel: string): Promise<void> {
  const { error } = await supabase.rpc("lern_live_freigeben", { p_live: id, p_titel: titel });
  if (error) throw new Error(meldung(error));
  await aktuellLaden();
}

export async function livePuls(id: string, zuschauer: number): Promise<void> {
  await supabase.rpc("lern_live_puls", { p_live: id, p_zuschauer: zuschauer });
}

export async function liveBeenden(id: string): Promise<void> {
  await supabase.rpc("lern_live_beenden", { p_live: id });
  await aktuellLaden();
}
