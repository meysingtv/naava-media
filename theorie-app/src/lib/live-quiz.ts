import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { antwortReihenfolge, FRAGEN, frageVon, type Frage } from "@/lib/fragen";
import { kanalName, meldung } from "@/lib/live";
import { serverJetzt, uhrStellen } from "@/lib/server-uhr";
import { serverVerbunden, supabase } from "@/lib/supabase";

// Live-Quiz: Der Inhaber blendet im Live eine Frage aus dem Katalog ein, alle
// tippen ihre Antwort, dann kommt die Auflösung mit Punkten und Rangliste (SQL
// Abschnitt 18). Neues erreicht die Zuschauer über Supabase Realtime und
// zusätzlich als Signal des Gastgebers über LiveKit – was zuerst ankommt.

export type QuizStatus = "offen" | "aufgeloest" | "rangliste" | "fertig";

export type QuizSpieler = {
  id: string;
  name: string;
  bild_pfad: string | null;
  avatar_farbe: string;
  punkte: number;
  richtige: number;
  platz: number;
};

export type LiveQuiz = {
  id: string;
  live_id: string;
  nummer: number;
  frage_id: string;
  frage: string;
  bild: string | null;
  thema: string;
  /** In der Reihenfolge des Katalogs. */
  antworten: string[];
  /** Anzeige-Reihenfolge: Positionen in `antworten`. */
  reihenfolge: number[];
  dauer: number;
  status: QuizStatus;
  gestartet_am: string;
  endet_am: string;
  /** Erst nach der Auflösung. */
  richtig: number[] | null;
  erklaerung: string;
  /** Stimmen je Antwort (Katalog-Reihenfolge), nach der Auflösung. */
  verteilung: number[] | null;
  teilnehmer: number;
  richtige: number;
  bestenliste: QuizSpieler[];
};

export type QuizMeins = { auswahl: number[]; zeit_ms: number; richtig: boolean | null; punkte: number };
export type QuizStand = { punkte: number; richtige: number; platz: number; spieler: number };
export type QuizLage = { quiz: LiveQuiz | null; mein: QuizMeins | null; stand: QuizStand | null };
export type QuizZwischenstand = { teilnehmer: number; verteilung: number[] };

/** Zeit zum Antworten, wählbar beim Start. */
export const QUIZ_DAUERN = [15, 20, 30] as const;

/** Fürs Live geeignet: Fragen zum Ankreuzen. */
export const QUIZ_FRAGEN: Frage[] = FRAGEN.filter((f) => f.art === "auswahl");

const LEER: QuizLage = { quiz: null, mein: null, stand: null };

// Uhr nach der Serverzeit (eigene Datei, hier weitergereicht)
export { serverJetzt, uhrStellen } from "@/lib/server-uhr";

/** Restzeit einer offenen Frage in Millisekunden. */
export function quizRestzeit(quiz: LiveQuiz): number {
  return Math.max(0, Date.parse(quiz.endet_am) - serverJetzt());
}

/** Die richtigen Antworten aus dem Katalog (Positionen wie in `antworten`). */
function loesungAusKatalog(quiz: LiveQuiz): { richtig: number[]; erklaerung: string } | null {
  const frage = frageVon(quiz.frage_id);
  if (!frage || frage.art !== "auswahl" || frage.antworten.length !== quiz.antworten.length) return null;
  const richtig = frage.antworten.flatMap((a, i) => (a.richtig ? [i] : []));
  return richtig.length ? { richtig, erklaerung: frage.erklaerung } : null;
}

/** Für den Gastgeber: Welche Antworten richtig sind – schon vor der Auflösung. */
export function quizLoesung(quiz: LiveQuiz): number[] {
  return quiz.richtig ?? loesungAusKatalog(quiz)?.richtig ?? [];
}

// ---------------------------------------------------------------------------
// Zuschauer: aktuelle Frage, eigene Antwort, eigener Platz
// ---------------------------------------------------------------------------

export function useQuizZuschauer(liveId: string | null): {
  lage: QuizLage;
  /** Neu laden, z. B. nach einem Signal des Gastgebers (mehrere kurz hintereinander werden zusammengefasst). */
  neuLaden: () => void;
  antworten: (auswahl: number[]) => Promise<string | null>;
} {
  const [lage, setLage] = useState<QuizLage>(LEER);
  const lageRef = useRef(lage);
  lageRef.current = lage;
  const idRef = useRef(liveId);
  idRef.current = liveId;
  const anfrage = useRef(0);
  const plan = useRef<ReturnType<typeof setTimeout> | null>(null);

  const laden = useCallback(async () => {
    const id = idRef.current;
    if (!id || !serverVerbunden) return;
    const nummer = ++anfrage.current;
    const vorher = Date.now();
    const { data, error } = await supabase.rpc("lern_live_quiz_laden", { p_live: id });
    const nachher = Date.now();
    // Nur die neueste Antwort zählt – eine langsame ältere überschreibt nichts.
    if (nummer !== anfrage.current || id !== idRef.current || error || !data) return;
    const d = data as QuizLage & { jetzt?: string };
    uhrStellen(d.jetzt, vorher, nachher);
    setLage({ quiz: d.quiz ?? null, mein: d.mein ?? null, stand: d.stand ?? null });
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
      .channel(kanalName(`live-quiz-${liveId}`))
      .on("postgres_changes", { event: "*", schema: "public", table: "lern_live_quiz", filter: `live_id=eq.${liveId}` }, () => neuLaden())
      .subscribe();
    const vorne = AppState.addEventListener("change", (s) => s === "active" && neuLaden());
    return () => {
      anfrage.current += 1;
      if (plan.current) clearTimeout(plan.current);
      vorne.remove();
      supabase.removeChannel(kanal);
    };
  }, [liveId, laden, neuLaden]);

  // Falls ein Signal verloren geht: Nach Ablauf der Zeit selbst nachsehen, bis die
  // Auflösung da ist; eine stehengebliebene Anzeige verschwindet spätestens nach 30 s.
  const quiz = lage.quiz;
  useEffect(() => {
    if (!quiz) return;
    const warten = quiz.status === "offen" ? quizRestzeit(quiz) + 5000 : 30_000;
    const t = setTimeout(laden, warten);
    return () => clearTimeout(t);
  }, [quiz, laden]);

  const antworten = useCallback(async (auswahl: number[]): Promise<string | null> => {
    const q = lageRef.current.quiz;
    if (!q || q.status !== "offen") return "Die Zeit für diese Frage ist um.";
    const { data, error } = await supabase.rpc("lern_live_quiz_antworten", { p_quiz: q.id, p_auswahl: auswahl });
    if (error) return meldung(error);
    const d = (data ?? {}) as { auswahl?: number[]; zeit_ms?: number };
    setLage((alt) => (alt.quiz?.id === q.id ? { ...alt, mein: { auswahl: d.auswahl ?? auswahl, zeit_ms: d.zeit_ms ?? 0, richtig: null, punkte: 0 } } : alt));
    return null;
  }, []);

  return { lage, neuLaden, antworten };
}

// ---------------------------------------------------------------------------
// Gastgeber: Frage starten, Zwischenstand, Auflösen, Rangliste, Schließen
// ---------------------------------------------------------------------------

export type QuizGastgeber = {
  quiz: LiveQuiz | null;
  zwischen: QuizZwischenstand | null;
  /** Ids der Fragen, die in diesem Live schon dran waren. */
  gefragt: string[];
  /** Die Besten im ganzen Live (nach der letzten Auflösung). */
  bestenliste: QuizSpieler[];
  beschaeftigt: boolean;
  starten: (frage: Frage, dauer: number) => Promise<string | null>;
  aufloesen: () => Promise<string | null>;
  rangliste: () => Promise<string | null>;
  schliessen: () => Promise<string | null>;
  zuruecksetzen: () => void;
};

/**
 * Quiz-Steuerung für den Gastgeber. `signal` sagt allen Zuschauern über LiveKit
 * Bescheid, dass sie neu laden sollen; `onFehler` meldet, wenn das automatische
 * Auflösen nicht klappt.
 */
export function useQuizGastgeber(liveId: string | null, signal: () => void, onFehler: (text: string) => void): QuizGastgeber {
  const [quiz, setQuiz] = useState<LiveQuiz | null>(null);
  const [zwischen, setZwischen] = useState<QuizZwischenstand | null>(null);
  const [gefragt, setGefragt] = useState<string[]>([]);
  const [bestenliste, setBestenliste] = useState<QuizSpieler[]>([]);
  const [beschaeftigt, setBeschaeftigt] = useState(false);
  const quizRef = useRef(quiz);
  quizRef.current = quiz;
  const signalRef = useRef(signal);
  signalRef.current = signal;

  /** Antwort des Servers übernehmen: Uhr stellen, Frage merken, alle benachrichtigen. */
  const uebernehmen = useCallback((daten: unknown, vorher: number) => {
    const d = daten as LiveQuiz & { jetzt?: string };
    uhrStellen(d.jetzt, vorher, Date.now());
    const neu = d.status === "fertig" ? null : d;
    setQuiz(neu);
    if (d.status !== "offen" && Array.isArray(d.bestenliste) && d.richtig) setBestenliste(d.bestenliste);
    signalRef.current();
  }, []);

  const ausfuehren = useCallback(async (aufruf: () => PromiseLike<{ data: unknown; error: unknown }>): Promise<string | null> => {
    setBeschaeftigt(true);
    const vorher = Date.now();
    try {
      const { data, error } = await aufruf();
      if (error) return meldung(error);
      if (data) uebernehmen(data, vorher);
      return null;
    } catch (e) {
      return meldung(e);
    } finally {
      setBeschaeftigt(false);
    }
  }, [uebernehmen]);

  const starten = useCallback(
    async (frage: Frage, dauer: number) => {
      if (!liveId || frage.art !== "auswahl") return "Das Live läuft gerade nicht.";
      const reihenfolge = antwortReihenfolge(frage);
      const problem = await ausfuehren(() =>
        supabase.rpc("lern_live_quiz_starten", {
          p_live: liveId,
          p_frage_id: frage.id,
          p_frage: frage.text,
          p_bild: frage.bild ?? null,
          p_thema: frage.thema,
          p_antworten: frage.antworten.map((a) => a.text),
          p_reihenfolge: reihenfolge.length ? reihenfolge : frage.antworten.map((_, i) => i),
          p_dauer: dauer,
        }),
      );
      if (!problem) {
        setZwischen({ teilnehmer: 0, verteilung: frage.antworten.map(() => 0) });
        setGefragt((alt) => (alt.includes(frage.id) ? alt : [...alt, frage.id]));
      }
      return problem;
    },
    [liveId, ausfuehren],
  );

  const aufloesen = useCallback(async () => {
    const q = quizRef.current;
    if (!q || q.status !== "offen") return null;
    const loesung = loesungAusKatalog(q);
    if (!loesung) return "Die Lösung zu dieser Frage fehlt in der App.";
    return ausfuehren(() => supabase.rpc("lern_live_quiz_aufloesen", { p_quiz: q.id, p_richtig: loesung.richtig, p_erklaerung: loesung.erklaerung }));
  }, [ausfuehren]);

  const rangliste = useCallback(async () => {
    const q = quizRef.current;
    if (!q) return null;
    return ausfuehren(() => supabase.rpc("lern_live_quiz_weiter", { p_quiz: q.id, p_status: "rangliste" }));
  }, [ausfuehren]);

  const schliessen = useCallback(async () => {
    const q = quizRef.current;
    if (!q) return null;
    setZwischen(null);
    return ausfuehren(() => supabase.rpc("lern_live_quiz_weiter", { p_quiz: q.id, p_status: "fertig" }));
  }, [ausfuehren]);

  // Live vorbei: Frage ausblenden (Sieger und gestellte Fragen bleiben für den Abschluss).
  useEffect(() => {
    if (liveId) return;
    setQuiz(null);
    setZwischen(null);
  }, [liveId]);

  const zuruecksetzen = useCallback(() => {
    setQuiz(null);
    setZwischen(null);
    setGefragt([]);
    setBestenliste([]);
  }, []);

  // Zwischenstand jede Sekunde, solange die Zeit läuft.
  const offeneId = quiz?.status === "offen" ? quiz.id : null;
  useEffect(() => {
    if (!offeneId) return;
    let aktiv = true;
    const holen = async () => {
      const { data } = await supabase.rpc("lern_live_quiz_stand", { p_quiz: offeneId });
      if (aktiv && data) setZwischen(data as QuizZwischenstand);
    };
    holen();
    const t = setInterval(holen, 1000);
    return () => {
      aktiv = false;
      clearInterval(t);
    };
  }, [offeneId]);

  // Ist die Zeit um, löst die App von selbst auf (mit 1,5 s Luft für späte Antworten).
  const aufloesenRef = useRef(aufloesen);
  aufloesenRef.current = aufloesen;
  const fehlerRef = useRef(onFehler);
  fehlerRef.current = onFehler;
  const endet = quiz?.status === "offen" ? quiz.endet_am : null;
  useEffect(() => {
    if (!endet || !quizRef.current) return;
    const t = setTimeout(async () => {
      const problem = await aufloesenRef.current();
      if (problem) fehlerRef.current(problem);
    }, quizRestzeit(quizRef.current) + 1500);
    return () => clearTimeout(t);
  }, [endet]);

  return { quiz, zwischen, gefragt, bestenliste, beschaeftigt, starten, aufloesen, rangliste, schliessen, zuruecksetzen };
}
