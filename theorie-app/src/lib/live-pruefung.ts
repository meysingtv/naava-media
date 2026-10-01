import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { FRAGEN, THEMEN, type Frage } from "@/lib/fragen";
import { kanalName, meldung } from "@/lib/live";
import { serverJetzt, uhrStellen } from "@/lib/live-quiz";
import { gemischt } from "@/lib/stand";
import { serverVerbunden, supabase } from "@/lib/supabase";

// Live-Prüfung: Der Inhaber startet im Live für alle gleichzeitig eine Prüfung
// wie in der App – 20 Fragen, 10 Minuten, Fehlerpunkte, bestanden bis 10 Punkte.
// Die Lösung kennt nur der Server (SQL Abschnitt 19); er wertet beim Abgeben und
// beim Ende für alle. Der Inhaber sieht live, wie weit alle sind.

export const PRUEFUNG_FRAGEN = 20;
export const PRUEFUNG_SEKUNDEN = 10 * 60;
export const PRUEFUNG_MAX_FEHLER = 10;

export type PruefungStatus = "laeuft" | "auswertung" | "fertig";
/** Antwort auf eine Frage: angekreuzte Antworten (Katalog-Positionen) oder eine Zahl. */
export type PruefungsAntwort = { a?: number[]; e?: string };
/** Antworten je Fragennummer (0, 1, 2 …). */
export type PruefungsAntworten = Record<string, PruefungsAntwort>;

export type PruefungSpieler = {
  id: string;
  name: string;
  bild_pfad: string | null;
  avatar_farbe: string;
  fehlerpunkte: number;
  bestanden: boolean;
  zeit_ms: number;
  platz: number;
};

export type LivePruefung = {
  id: string;
  live_id: string;
  nummer: number;
  fragen: string[];
  punkte: number[];
  dauer: number;
  status: PruefungStatus;
  gestartet_am: string;
  endet_am: string;
  beendet_am: string | null;
  teilnehmer: number;
  bestanden: number;
  schnitt: number | null;
  schwerste: { nr: number; frage_id: string; falsch: number }[];
  bestenliste: PruefungSpieler[];
};

export type PruefungMeins = {
  antworten: PruefungsAntworten;
  beantwortet: number;
  abgegeben: boolean;
  fehlerpunkte: number | null;
  richtig: number | null;
  fuenfer: number | null;
  bestanden: boolean | null;
  falsch: number[] | null;
  zeit_ms: number | null;
};

export type PruefungLage = { pruefung: LivePruefung | null; mein: PruefungMeins | null; platz: { platz: number; von: number } | null };

export type PruefungStandSpieler = {
  id: string;
  name: string;
  bild_pfad: string | null;
  avatar_farbe: string;
  beantwortet: number;
  aktuell: number;
  abgegeben: boolean;
  fehlerpunkte: number | null;
  bestanden: boolean | null;
};

/** `fortschritt`: wie weit alle sind (0..1) – vom Server, auch bei mehr als 60 Teilnehmern. */
export type PruefungStand = { schreiben: number; abgegeben: number; bestanden: number; schnitt: number | null; fortschritt?: number | null; spieler: PruefungStandSpieler[] };

const LEER: PruefungLage = { pruefung: null, mein: null, platz: null };

/** Restzeit in Millisekunden (nach Serverzeit). */
export function pruefungRestzeit(p: LivePruefung): number {
  return Math.max(0, Date.parse(p.endet_am) - serverJetzt());
}

/** Fragen für die Live-Prüfung – möglichst gleichmäßig über alle Themen, wie in der Simulation. */
export function liveBogen(anzahl = PRUEFUNG_FRAGEN): Frage[] {
  const jeThema = Math.ceil(anzahl / THEMEN.length);
  const auswahl = THEMEN.flatMap((t) => gemischt(FRAGEN.filter((f) => f.thema === t.id)).slice(0, jeThema));
  return gemischt(auswahl).slice(0, Math.min(anzahl, FRAGEN.length));
}

function loesungVon(f: Frage) {
  return f.art === "auswahl" ? { r: f.antworten.flatMap((a, i) => (a.richtig ? [i] : [])) } : { z: f.loesung };
}

/** Ist die Frage beantwortet? */
export function istBeantwortet(f: Frage | undefined, a: PruefungsAntwort | undefined): boolean {
  if (!f || !a) return false;
  return f.art === "auswahl" ? (a.a?.length ?? 0) > 0 : (a.e ?? "").trim().length > 0;
}

// ---------------------------------------------------------------------------
// Zuschauer: mitschreiben, abgeben, Ergebnis
// ---------------------------------------------------------------------------

export function useLivePruefungZuschauer(liveId: string | null): {
  lage: PruefungLage;
  neuLaden: () => void;
  /** Zwischenstand sichern (gebündelt) – für den Live-Zähler und falls die App neu startet. */
  speichern: (antworten: PruefungsAntworten, aktuell: number) => void;
  abgeben: (antworten: PruefungsAntworten) => Promise<string | null>;
} {
  const [lage, setLage] = useState<PruefungLage>(LEER);
  const lageRef = useRef(lage);
  lageRef.current = lage;
  const idRef = useRef(liveId);
  idRef.current = liveId;
  const anfrage = useRef(0);
  const plan = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sichern = useRef<ReturnType<typeof setTimeout> | null>(null);

  const laden = useCallback(async () => {
    const id = idRef.current;
    if (!id || !serverVerbunden) return;
    const nummer = ++anfrage.current;
    const vorher = Date.now();
    const { data, error } = await supabase.rpc("lern_live_pruefung_laden", { p_live: id });
    const nachher = Date.now();
    if (nummer !== anfrage.current || id !== idRef.current || error || !data) return;
    const d = data as PruefungLage & { jetzt?: string };
    uhrStellen(d.jetzt, vorher, nachher);
    setLage({ pruefung: d.pruefung ?? null, mein: d.mein ?? null, platz: d.platz ?? null });
  }, []);

  const neuLaden = useCallback(() => {
    if (plan.current) clearTimeout(plan.current);
    plan.current = setTimeout(() => {
      plan.current = null;
      laden();
    }, 150);
  }, [laden]);

  useEffect(() => {
    setLage(LEER);
    if (!liveId || !serverVerbunden) return;
    laden();
    const kanal = supabase
      .channel(kanalName(`live-pruefung-${liveId}`))
      .on("postgres_changes", { event: "*", schema: "public", table: "lern_live_pruefung", filter: `live_id=eq.${liveId}` }, () => neuLaden())
      .subscribe();
    const vorne = AppState.addEventListener("change", (s) => s === "active" && neuLaden());
    return () => {
      anfrage.current += 1;
      if (plan.current) clearTimeout(plan.current);
      if (sichern.current) clearTimeout(sichern.current);
      vorne.remove();
      supabase.removeChannel(kanal);
    };
  }, [liveId, laden, neuLaden]);

  // Falls ein Signal verloren geht: nach Ablauf der Zeit selbst nachsehen; eine
  // stehengebliebene Auswertung verschwindet spätestens nach 30 s.
  const pruefung = lage.pruefung;
  useEffect(() => {
    if (!pruefung) return;
    const warten = pruefung.status === "laeuft" ? pruefungRestzeit(pruefung) + 22_000 : 30_000;
    const t = setTimeout(laden, warten);
    return () => clearTimeout(t);
  }, [pruefung, laden]);

  const speichern = useCallback((antworten: PruefungsAntworten, aktuell: number) => {
    const p = lageRef.current.pruefung;
    if (!p || p.status !== "laeuft") return;
    if (sichern.current) clearTimeout(sichern.current);
    sichern.current = setTimeout(() => {
      sichern.current = null;
      supabase.rpc("lern_live_pruefung_speichern", { p_pruefung: p.id, p_antworten: antworten, p_aktuell: aktuell }).then(
        () => {},
        () => {},
      );
    }, 700);
  }, []);

  const abgeben = useCallback(async (antworten: PruefungsAntworten): Promise<string | null> => {
    const p = lageRef.current.pruefung;
    if (!p) return "Die Prüfung ist vorbei.";
    if (sichern.current) clearTimeout(sichern.current);
    const { data, error } = await supabase.rpc("lern_live_pruefung_abgeben", { p_pruefung: p.id, p_antworten: antworten });
    if (error) return meldung(error);
    const mein = data as PruefungMeins | null;
    if (mein) setLage((alt) => (alt.pruefung?.id === p.id ? { ...alt, mein } : alt));
    return null;
  }, []);

  return { lage, neuLaden, speichern, abgeben };
}

// ---------------------------------------------------------------------------
// Gastgeber: starten, Live-Zähler, verlängern, beenden, schließen
// ---------------------------------------------------------------------------

export type PruefungGastgeber = {
  pruefung: LivePruefung | null;
  stand: PruefungStand | null;
  beschaeftigt: boolean;
  /** Wie viele Prüfungen in diesem Live gestartet wurden. */
  anzahl: number;
  starten: () => Promise<string | null>;
  verlaengern: (sekunden: number) => Promise<string | null>;
  beenden: () => Promise<string | null>;
  schliessen: () => Promise<string | null>;
  zuruecksetzen: () => void;
};

/**
 * Prüfungs-Steuerung für den Gastgeber. `signal` sagt allen Zuschauern über
 * LiveKit Bescheid; `onFehler` meldet, wenn das automatische Beenden scheitert.
 */
export function useLivePruefungGastgeber(liveId: string | null, signal: () => void, onFehler: (text: string) => void): PruefungGastgeber {
  const [pruefung, setPruefung] = useState<LivePruefung | null>(null);
  const [stand, setStand] = useState<PruefungStand | null>(null);
  const [beschaeftigt, setBeschaeftigt] = useState(false);
  const [anzahl, setAnzahl] = useState(0);
  const pruefungRef = useRef(pruefung);
  pruefungRef.current = pruefung;
  const signalRef = useRef(signal);
  signalRef.current = signal;
  const fehlerRef = useRef(onFehler);
  fehlerRef.current = onFehler;

  const standHolen = useCallback(async (id: string) => {
    const vorher = Date.now();
    const { data } = await supabase.rpc("lern_live_pruefung_stand", { p_pruefung: id });
    if (!data || pruefungRef.current?.id !== id) return;
    const d = data as PruefungStand & { jetzt?: string };
    uhrStellen(d.jetzt, vorher, Date.now());
    setStand({ schreiben: d.schreiben, abgegeben: d.abgegeben, bestanden: d.bestanden, schnitt: d.schnitt, fortschritt: d.fortschritt ?? null, spieler: d.spieler ?? [] });
  }, []);

  const ausfuehren = useCallback(async (aufruf: () => PromiseLike<{ data: unknown; error: unknown }>): Promise<string | null> => {
    setBeschaeftigt(true);
    const vorher = Date.now();
    try {
      const { data, error } = await aufruf();
      if (error) return meldung(error);
      const d = data as (LivePruefung & { jetzt?: string }) | null;
      if (d) {
        uhrStellen(d.jetzt, vorher, Date.now());
        setPruefung(d.status === "fertig" ? null : d);
        if (d.status !== "fertig") standHolen(d.id);
      }
      signalRef.current();
      return null;
    } catch (e) {
      return meldung(e);
    } finally {
      setBeschaeftigt(false);
    }
  }, [standHolen]);

  const starten = useCallback(async () => {
    if (!liveId) return "Das Live läuft gerade nicht.";
    const bogen = liveBogen();
    setStand(null);
    const problem = await ausfuehren(() =>
      supabase.rpc("lern_live_pruefung_starten", {
        p_live: liveId,
        p_fragen: bogen.map((f) => f.id),
        p_punkte: bogen.map((f) => f.punkte),
        p_loesungen: bogen.map(loesungVon),
        p_dauer: PRUEFUNG_SEKUNDEN,
      }),
    );
    if (!problem) setAnzahl((a) => a + 1);
    return problem;
  }, [liveId, ausfuehren]);

  const verlaengern = useCallback(
    async (sekunden: number) => {
      const p = pruefungRef.current;
      if (!p || p.status !== "laeuft") return null;
      return ausfuehren(() => supabase.rpc("lern_live_pruefung_verlaengern", { p_pruefung: p.id, p_sekunden: sekunden }));
    },
    [ausfuehren],
  );

  const beenden = useCallback(async () => {
    const p = pruefungRef.current;
    if (!p) return null;
    return ausfuehren(() => supabase.rpc("lern_live_pruefung_beenden", { p_pruefung: p.id }));
  }, [ausfuehren]);

  const schliessen = useCallback(async () => {
    const p = pruefungRef.current;
    if (!p) return null;
    setStand(null);
    return ausfuehren(() => supabase.rpc("lern_live_pruefung_schliessen", { p_pruefung: p.id }));
  }, [ausfuehren]);

  const zuruecksetzen = useCallback(() => {
    setPruefung(null);
    setStand(null);
    setAnzahl(0);
  }, []);

  // Live vorbei: Prüfung ausblenden.
  useEffect(() => {
    if (liveId) return;
    setPruefung(null);
    setStand(null);
  }, [liveId]);

  // Live-Zähler alle 2 Sekunden, solange geschrieben wird.
  const laufendId = pruefung?.status === "laeuft" ? pruefung.id : null;
  useEffect(() => {
    if (!laufendId) return;
    standHolen(laufendId);
    const t = setInterval(() => standHolen(laufendId), 2000);
    return () => clearInterval(t);
  }, [laufendId, standHolen]);

  // Zeit um: nach 4 s Luft (letzte automatische Abgaben) für alle beenden.
  const beendenRef = useRef(beenden);
  beendenRef.current = beenden;
  const endet = pruefung?.status === "laeuft" ? pruefung.endet_am : null;
  useEffect(() => {
    if (!endet || !pruefungRef.current) return;
    const t = setTimeout(async () => {
      const problem = await beendenRef.current();
      if (problem) fehlerRef.current(problem);
    }, pruefungRestzeit(pruefungRef.current) + 4000);
    return () => clearTimeout(t);
  }, [endet]);

  return { pruefung, stand, beschaeftigt, anzahl, starten, verlaengern, beenden, schliessen, zuruecksetzen };
}
