import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState, Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";

import { antwortHoeren } from "./antwort-hoerer";
import { FRAGEN, type ThemaId } from "./fragen";
import { useKonto } from "./konto";
import { useStand } from "./stand";
import { serverVerbunden, supabase } from "./supabase";

/**
 * Crew: 2–6 Leute lernen zusammen. Gemeinsame Flamme (wächst nur, wenn alle ihr
 * Tagesziel schaffen), Anstupsen, Einladungen und jede Woche ein Boss aus dem
 * schwächsten Thema der Crew. Server: supabase/schema.sql, Abschnitt 16.
 */

export type Crew = { id: string; name: string; code: string; flamme: number; flamme_heute: boolean; flamme_beste: number; gruender: boolean };
export type CrewMitglied = { id: string; name: string; benutzername: string; bild: string | null; farbe: string; heute: number; ziel: number; ich: boolean };
export type CrewBoss = { id: string; thema: ThemaId; hp: number; hp_max: number; woche: string; bis: string; besiegt: boolean };
export type CrewEreignis = {
  id: number;
  art: "gruendung" | "beitritt" | "austritt" | "stupser" | "treffer" | "flamme" | "sieg";
  wert: number;
  richtig: number;
  falsch: number;
  zeit: string;
  user_id: string | null;
  name: string | null;
  bild: string | null;
  farbe: string | null;
  an_mich: boolean;
  ziel_name: string | null;
};
export type CrewEinladung = { id: string; crew_name: string; von_name: string; von_bild: string | null; von_farbe: string; mitglieder: number };
export type CrewDaten = {
  crew: Crew | null;
  mitglieder?: CrewMitglied[];
  boss?: CrewBoss;
  ereignisse?: CrewEreignis[];
  stupser?: { von: string; zeit: string } | null;
  belohnungen?: number;
  einladungen?: CrewEinladung[];
};

/** Jeder Boss hat sein Thema, einen Namen und ein Gesicht. */
export const BOSSE: Record<ThemaId, { name: string; emoji: string }> = {
  vorfahrt: { name: "Vorfahrt-Drache", emoji: "🐉" },
  gefahren: { name: "Gefahren-Wolf", emoji: "🐺" },
  zeichen: { name: "Schilder-Troll", emoji: "👹" },
  umwelt: { name: "Abgas-Monster", emoji: "👾" },
  technik: { name: "Rost-Roboter", emoji: "🤖" },
  manoever: { name: "Drängel-Hai", emoji: "🦈" },
  tempo: { name: "Raser-Raptor", emoji: "🦖" },
  parken: { name: "Knöllchen-Krake", emoji: "🐙" },
  autobahn: { name: "Autobahn-Phantom", emoji: "👻" },
  mensch: { name: "Promille-Zombie", emoji: "🧟" },
  zahlen: { name: "Formel-Golem", emoji: "🗿" },
};
export const bossVon = (thema: string) => BOSSE[thema as ThemaId] ?? BOSSE.vorfahrt;

export const SCHADEN_RICHTIG = 5;
export const HEILUNG_FALSCH = 3;
export const XP_TRUHE = 150;
export const CREW_MAX = 6;

/** „ABCD-EFGH“ aus beliebiger Eingabe (Kleinbuchstaben, ohne Strich, mit Leerzeichen). */
export function codeFormatieren(roh: string): string {
  const z = roh.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  return z.length > 4 ? `${z.slice(0, 4)}-${z.slice(4)}` : z;
}

// Parameter „crew“ statt „code“: Links mit „code“ hält die Anmeldung für einen Login-Link.
export const crewLink = (code: string) => `spur://crew-beitreten?crew=${encodeURIComponent(code)}`;

/** Wie viele haben heute ihr Tagesziel? */
export function heuteGeschafft(m: CrewMitglied[]): number {
  return m.filter((x) => x.heute >= x.ziel).length;
}

function fehlerText(e: unknown): string {
  const m = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "";
  if (/Nicht angemeldet/i.test(m)) return "Melde dich an, um mit einer Crew zu lernen.";
  if (/function .* does not exist|Could not find the function|schema cache/i.test(m)) return "Die Crew ist auf dem Server noch nicht eingerichtet.";
  if (/Failed to fetch|Network request failed|fetch failed/i.test(m)) return "Keine Verbindung – versuch es gleich nochmal.";
  // Meldungen aus den Server-Funktionen sind schon für Menschen geschrieben.
  if (m && m.length < 140 && !/[{}]|violates|syntax|column|relation/i.test(m)) return m;
  return "Das hat nicht geklappt. Versuch es gleich nochmal.";
}

// ---------------------------------------------------------------------------
// Treffer-Anzeige: kurze Einblendung „−5 HP“, wenn eine Antwort den Boss trifft
// ---------------------------------------------------------------------------

export type BossTreffer = { hp: number; emoji: string };
const trefferHoerer = new Set<(t: BossTreffer) => void>();
export function bossTrefferHoeren(h: (t: BossTreffer) => void): () => void {
  trefferHoerer.add(h);
  return () => {
    trefferHoerer.delete(h);
  };
}

// ---------------------------------------------------------------------------
// Push: Token beim Server hinterlegen (Anstupsen, Einladungen, Boss-Sieg)
// ---------------------------------------------------------------------------

export async function pushEinrichten(fragen: boolean): Promise<void> {
  if (Platform.OS === "web" || !serverVerbunden) return;
  try {
    const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
    const projectId = extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    // Ohne EAS-Projekt (eas init) gibt es kein Push-Token – die Crew klappt trotzdem.
    if (!projectId) return;
    let rechte = await Notifications.getPermissionsAsync();
    if (!rechte.granted && fragen && rechte.canAskAgain) rechte = await Notifications.requestPermissionsAsync();
    if (!rechte.granted) return;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await supabase.rpc("lern_push_token_setzen", { p_token: token });
  } catch {
    // Push ist ein Zusatz.
  }
}

// ---------------------------------------------------------------------------
// Kontext
// ---------------------------------------------------------------------------

type CrewKontext = {
  /** Kann man hier überhaupt eine Crew haben (Server + Konto)? */
  moeglich: boolean;
  daten: CrewDaten | null;
  laedt: boolean;
  fehler: string | null;
  neuLaden: () => Promise<void>;
  gruenden: (name: string) => Promise<string | null>;
  beitreten: (code: string) => Promise<string | null>;
  verlassen: () => Promise<string | null>;
  einladen: (nutzer: string) => Promise<string | null>;
  einladungAntworten: (id: string, annehmen: boolean) => Promise<string | null>;
  stupsen: (nutzer: string) => Promise<string | null>;
  /** Belohnungen besiegter Bosse abholen; gibt die gutgeschriebenen XP zurück. */
  belohnungenAbholen: () => Promise<number>;
};

const Kontext = createContext<CrewKontext | null>(null);

type TrefferAntwort = { hp: number; hp_max: number; besiegt: boolean };

const THEMA_VON = new Map(FRAGEN.map((f) => [f.id, f.thema]));

export function CrewProvider({ children }: { children: ReactNode }) {
  const { session, drin, gast } = useKonto();
  const { erfolgMelden } = useStand();
  const nutzer = session?.user.id ?? null;
  const moeglich = serverVerbunden && Boolean(nutzer) && drin && !gast;

  const [daten, setDaten] = useState<CrewDaten | null>(null);
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const datenRef = useRef(daten);
  datenRef.current = daten;
  const zuletzt = useRef(0);
  const nutzerRef = useRef(nutzer);
  nutzerRef.current = nutzer;

  const uebernehmen = useCallback(
    (d: CrewDaten | null) => {
      setDaten(d);
      setFehler(null);
      if (d?.crew) erfolgMelden("crew");
    },
    [erfolgMelden],
  );

  const neuLaden = useCallback(async () => {
    if (!moeglich) return;
    const fuer = nutzerRef.current;
    zuletzt.current = Date.now();
    setLaedt(true);
    try {
      const { data, error } = await supabase.rpc("lern_crew_laden");
      if (error) throw error;
      if (nutzerRef.current === fuer) uebernehmen((data as CrewDaten | null) ?? { crew: null, einladungen: [] });
    } catch (e) {
      if (nutzerRef.current === fuer) setFehler(fehlerText(e));
    } finally {
      setLaedt(false);
    }
  }, [moeglich, uebernehmen]);

  // Beim Anmelden laden, beim Abmelden vergessen.
  useEffect(() => {
    setDaten(null);
    if (moeglich) neuLaden();
  }, [moeglich, nutzer, neuLaden]);

  // Zurück in der App: auffrischen (höchstens alle 20 Sekunden).
  useEffect(() => {
    const abo = AppState.addEventListener("change", (z) => {
      if (z === "active" && Date.now() - zuletzt.current > 20000) neuLaden();
    });
    return () => abo.remove();
  }, [neuLaden]);

  // Push-Token hinterlegen, wenn die Erlaubnis schon da ist.
  useEffect(() => {
    if (moeglich && daten?.crew) pushEinrichten(false);
  }, [moeglich, daten?.crew?.id]);

  // Tipp auf eine Crew-Mitteilung öffnet die passende Seite.
  useEffect(() => {
    if (Platform.OS === "web") return;
    const oeffnen = (antwort: Notifications.NotificationResponse | null) => {
      const url = antwort?.notification.request.content.data?.url;
      if (typeof url === "string" && url.startsWith("/crew")) router.push(url as "/crew");
    };
    Notifications.getLastNotificationResponseAsync().then(oeffnen).catch(() => {});
    const abo = Notifications.addNotificationResponseReceivedListener(oeffnen);
    return () => abo.remove();
  }, []);

  // --- Treffer auf den Boss: sofort anzeigen, gebündelt an den Server schicken
  const offen = useRef({ r: 0, f: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const senden = useCallback(async () => {
    let { r, f } = offen.current;
    offen.current = { r: 0, f: 0 };
    const thema = datenRef.current?.boss?.thema;
    if (!thema || r + f === 0) return;
    let letzte: TrefferAntwort | null = null;
    try {
      while (r + f > 0) {
        const cr = Math.min(r, 30);
        const cf = Math.min(f, 30 - cr);
        r -= cr;
        f -= cf;
        const { data, error } = await supabase.rpc("lern_crew_treffer", { p_thema: thema, p_richtig: cr, p_falsch: cf });
        if (error) throw error;
        letzte = data as TrefferAntwort | null;
        if (!letzte || letzte.besiegt) break;
      }
    } catch {
      // Offline: Die Treffer gehen verloren, der Lernstand selbst bleibt.
    }
    if (letzte) {
      const l = letzte;
      setDaten((d) => (d?.boss ? { ...d, boss: { ...d.boss, hp: l.hp, hp_max: l.hp_max, besiegt: l.besiegt } } : d));
      if (l.besiegt) neuLaden();
    }
  }, [neuLaden]);

  useEffect(
    () =>
      antwortHoeren((frageId, richtig) => {
        const d = datenRef.current;
        const boss = d?.boss;
        if (!d?.crew || !boss || boss.besiegt || THEMA_VON.get(frageId) !== boss.thema) return;
        const aenderung = richtig ? -SCHADEN_RICHTIG : HEILUNG_FALSCH;
        setDaten((alt) =>
          alt?.boss ? { ...alt, boss: { ...alt.boss, hp: Math.max(0, Math.min(alt.boss.hp_max, alt.boss.hp + aenderung)) } } : alt,
        );
        for (const h of trefferHoerer) h({ hp: aenderung, emoji: bossVon(boss.thema).emoji });
        if (richtig) offen.current.r++;
        else offen.current.f++;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(senden, 2000);
      }),
    [senden],
  );

  // --- Aktionen
  const aufruf = useCallback(
    async (name: string, argumente?: Record<string, unknown>, mitDaten = false): Promise<string | null> => {
      if (!moeglich) return "Melde dich an, um mit einer Crew zu lernen.";
      try {
        const { data, error } = await supabase.rpc(name, argumente);
        if (error) throw error;
        if (mitDaten && data) uebernehmen(data as CrewDaten);
        else await neuLaden();
        return null;
      } catch (e) {
        return fehlerText(e);
      }
    },
    [moeglich, neuLaden, uebernehmen],
  );

  const gruenden = useCallback(
    async (name: string) => {
      const f = await aufruf("lern_crew_gruenden", { p_name: name }, true);
      if (!f) pushEinrichten(true);
      return f;
    },
    [aufruf],
  );
  const beitreten = useCallback(
    async (code: string) => {
      const f = await aufruf("lern_crew_beitreten", { p_code: code }, true);
      if (!f) pushEinrichten(true);
      return f;
    },
    [aufruf],
  );
  const verlassen = useCallback(() => aufruf("lern_crew_verlassen"), [aufruf]);
  const einladen = useCallback((id: string) => aufruf("lern_crew_einladen", { p_an: id }), [aufruf]);
  const einladungAntworten = useCallback(
    async (id: string, annehmen: boolean) => {
      const f = await aufruf("lern_crew_einladung_antworten", { p_id: id, p_annehmen: annehmen }, true);
      if (!f && annehmen) pushEinrichten(true);
      return f;
    },
    [aufruf],
  );
  const stupsen = useCallback((id: string) => aufruf("lern_crew_stupsen", { p_ziel: id }), [aufruf]);

  const belohnungenAbholen = useCallback(async () => {
    if (!moeglich) return 0;
    try {
      const { data, error } = await supabase.rpc("lern_crew_belohnungen_abholen");
      if (error) throw error;
      const anzahl = Array.isArray(data) ? data.length : 0;
      if (anzahl > 0) erfolgMelden("crew-boss", anzahl * XP_TRUHE);
      setDaten((d) => (d ? { ...d, belohnungen: 0 } : d));
      return anzahl * XP_TRUHE;
    } catch {
      return 0;
    }
  }, [moeglich, erfolgMelden]);

  const wert = useMemo<CrewKontext>(
    () => ({ moeglich, daten, laedt, fehler, neuLaden, gruenden, beitreten, verlassen, einladen, einladungAntworten, stupsen, belohnungenAbholen }),
    [moeglich, daten, laedt, fehler, neuLaden, gruenden, beitreten, verlassen, einladen, einladungAntworten, stupsen, belohnungenAbholen],
  );

  return <Kontext.Provider value={wert}>{children}</Kontext.Provider>;
}

export function useCrew(): CrewKontext {
  const k = useContext(Kontext);
  if (!k) throw new Error("useCrew außerhalb von CrewProvider");
  return k;
}
