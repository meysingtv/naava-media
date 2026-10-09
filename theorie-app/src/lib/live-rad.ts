import type { ThemaId } from "@/lib/fragen";
import { meldung } from "@/lib/live";
import { QUIZ_FRAGEN } from "@/lib/live-quiz";
import { serverJetzt, uhrStellen } from "@/lib/server-uhr";
import { supabase } from "@/lib/supabase";

// Themenrad im Live: Der Inhaber dreht, der Server bestimmt Ziel, Stelle im Feld
// und Umdrehungen und eine Startzeit kurz in der Zukunft (SQL Abschnitt 20).
// Weil der Winkel nur von der Serverzeit abhängt, steht das Rad bei allen im
// selben Moment an derselben Stelle – auch bei allen, die mitten im Drehen kommen.

export type LiveRad = {
  id: string;
  themen: string[];
  ziel: number;
  /** Stelle im Zielfeld (0,2–0,8), damit es nicht immer genau mittig hält. */
  versatz: number;
  runden: number;
  start: string;
  /** Sekunden */
  dauer: number;
};

/** Kurze Namen fürs Rad (passen in ein Feld). */
export const RAD_NAMEN: Record<ThemaId, string> = {
  gefahren: "Gefahren",
  vorfahrt: "Vorfahrt",
  zeichen: "Zeichen",
  umwelt: "Umwelt",
  technik: "Technik",
  manoever: "Verhalten",
  tempo: "Tempo",
  parken: "Parken",
  autobahn: "Autobahn",
  mensch: "Recht",
  zahlen: "Formeln",
};

/** Themen fürs Rad: nur die mit mindestens zwei Quizfragen – höchstens zwölf. */
export function radThemen(): ThemaId[] {
  const anzahl = new Map<string, number>();
  for (const f of QUIZ_FRAGEN) anzahl.set(f.thema, (anzahl.get(f.thema) ?? 0) + 1);
  return (Object.keys(RAD_NAMEN) as ThemaId[]).filter((t) => (anzahl.get(t) ?? 0) >= 2).slice(0, 12);
}

export const radName = (thema: string) => RAD_NAMEN[thema as ThemaId] ?? thema;

/** Auslauf wie ein echtes Rad: schnell los, lange langsam aus. */
export function radAuslauf(p: number) {
  "worklet";
  const q = Math.min(1, Math.max(0, p));
  return 1 - Math.pow(1 - q, 4);
}

/** Winkel des Rads in Grad (im Uhrzeigersinn) beim Anteil p der Drehung. */
export function radWinkel(n: number, ziel: number, versatz: number, runden: number, p: number) {
  "worklet";
  const feld = 360 / n;
  return (runden * 360 - (ziel + versatz) * feld) * radAuslauf(p);
}

/** Wie weit die Drehung gerade ist (0 vor dem Start, 1 wenn es steht). */
export function radFortschritt(rad: LiveRad, jetzt = serverJetzt()) {
  const start = Date.parse(rad.start);
  return Math.min(1, Math.max(0, (jetzt - start) / (rad.dauer * 1000)));
}

/** Millisekunden bis zum Start (negativ, wenn es schon dreht). */
export const radBisStart = (rad: LiveRad) => Date.parse(rad.start) - serverJetzt();

/** Ist das Rad noch aktuell? (Nach dem Stehen bleibt es höchstens 90 s.) */
export const radAktuell = (rad: LiveRad | null | undefined): rad is LiveRad =>
  Boolean(rad?.id) && serverJetzt() < Date.parse(rad!.start) + rad!.dauer * 1000 + 90_000;

export async function radDrehen(liveId: string): Promise<{ rad: LiveRad } | { fehler: string }> {
  const vorher = Date.now();
  const { data, error } = await supabase.rpc("lern_live_rad_drehen", { p_live: liveId, p_themen: radThemen() });
  if (error) return { fehler: meldung(error) };
  const d = data as LiveRad & { jetzt?: string };
  uhrStellen(d.jetzt, vorher, Date.now());
  return { rad: d };
}

export async function radSchliessen(liveId: string): Promise<string | null> {
  const { error } = await supabase.rpc("lern_live_rad_schliessen", { p_live: liveId });
  return error ? meldung(error) : null;
}

/** Eine Quizfrage aus dem Thema, möglichst eine, die in diesem Live noch nicht dran war. */
export function frageAusThema(thema: string, gefragt: string[]) {
  const alle = QUIZ_FRAGEN.filter((f) => f.thema === thema);
  const neu = alle.filter((f) => !gefragt.includes(f.id));
  const topf = neu.length ? neu : alle;
  return topf[Math.floor(Math.random() * topf.length)] ?? null;
}
