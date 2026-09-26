import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ERFOLGE } from "./erfolge";
import { FRAGEN, type Frage, type ThemaId } from "./fragen";

/**
 * Lernstand – lokal gespeichert, damit die App offline und ohne Konto
 * funktioniert. Mit Konto wird er zusätzlich gesichert (siehe sync.tsx).
 *
 * Jede Frage liegt in einem Lernfach (Box 0–5): richtig → ein Fach weiter,
 * falsch → zurück auf 0. Ab Fach 3 gilt eine Frage als „sicher“.
 */

export type FrageStand = {
  r: number; // richtig
  f: number; // falsch
  t: number; // zuletzt beantwortet (ms)
  box: number;
  l: 0 | 1; // letzte Antwort richtig?
  m?: boolean; // gemerkt
};

export type Pruefung = { datum: string; fehlerpunkte: number; bestanden: boolean; richtig: number; gesamt: number };

export type Stand = {
  v: 1;
  fragen: Record<string, FrageStand>;
  xp: number;
  xpTage: Record<string, number>;
  antwortenTage: Record<string, number>;
  serie: number;
  besteSerie: number;
  letzterTag: string | null;
  tagesziel: number;
  erinnerung: { an: boolean; stunde: number; minute: number };
  erfolge: Record<string, string>;
  pruefungen: Pruefung[];
  duell: { rating: number; siege: number; niederlagen: number; remis: number };
  klasse: string;
  /** Bereits an den Server gemeldet (für die Rangliste). */
  gebucht: { xp: number; gesamt: number; richtig: number };
};

export const LEER: Stand = {
  v: 1,
  fragen: {},
  xp: 0,
  xpTage: {},
  antwortenTage: {},
  serie: 0,
  besteSerie: 0,
  letzterTag: null,
  tagesziel: 30,
  erinnerung: { an: false, stunde: 18, minute: 0 },
  erfolge: {},
  pruefungen: [],
  duell: { rating: 1000, siege: 0, niederlagen: 0, remis: 0 },
  klasse: "B",
  gebucht: { xp: 0, gesamt: 0, richtig: 0 },
};

const SPEICHER = "spur-stand-v1";

// ---------------------------------------------------------------------------
// Datum
// ---------------------------------------------------------------------------

const zwei = (n: number) => String(n).padStart(2, "0");

export function tagKey(d = new Date()): string {
  return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`;
}

function tagVerschoben(tage: number): string {
  const d = new Date();
  d.setDate(d.getDate() + tage);
  return tagKey(d);
}

/** Montag der aktuellen Woche. */
export function wochenStart(d = new Date()): Date {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const tag = (m.getDay() + 6) % 7; // Mo = 0
  m.setDate(m.getDate() - tag);
  return m;
}

// ---------------------------------------------------------------------------
// Ableitungen
// ---------------------------------------------------------------------------

/** Serie nur, wenn heute oder gestern gelernt wurde – sonst ist sie gerissen. */
export function serieAktuell(s: Stand): number {
  if (s.letzterTag === tagKey() || s.letzterTag === tagVerschoben(-1)) return s.serie;
  return 0;
}

export function heuteBeantwortet(s: Stand): number {
  return s.antwortenTage[tagKey()] ?? 0;
}

export function xpHeute(s: Stand): number {
  return s.xpTage[tagKey()] ?? 0;
}

export function xpWoche(s: Stand): number {
  const start = wochenStart();
  let summe = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    summe += s.xpTage[tagKey(d)] ?? 0;
  }
  return summe;
}

export type WochenTag = { kurz: string; gelernt: boolean; heute: boolean; zukunft: boolean };

export function wocheTage(s: Stand): WochenTag[] {
  const start = wochenStart();
  const heute = tagKey();
  const namen = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  return namen.map((kurz, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = tagKey(d);
    return { kurz, gelernt: (s.antwortenTage[key] ?? 0) > 0, heute: key === heute, zukunft: key > heute };
  });
}

function meisterung(box: number): number {
  return box >= 3 ? 1 : box === 2 ? 0.66 : box === 1 ? 0.33 : 0;
}

export type Statistik = { gesamt: number; gesehen: number; sicher: number; fehler: number; anteil: number };

export function statistik(s: Stand, liste: Frage[] = FRAGEN): Statistik {
  let gesehen = 0;
  let sicher = 0;
  let fehler = 0;
  let punkte = 0;
  for (const frage of liste) {
    const fs = s.fragen[frage.id];
    if (!fs) continue;
    if (fs.r + fs.f > 0) gesehen++;
    if (fs.box >= 3) sicher++;
    if (fs.l === 0 && fs.f > 0) fehler++;
    punkte += meisterung(fs.box);
  }
  return { gesamt: liste.length, gesehen, sicher, fehler, anteil: liste.length ? punkte / liste.length : 0 };
}

export function themaStatistik(s: Stand, thema: ThemaId): Statistik {
  return statistik(
    s,
    FRAGEN.filter((f) => f.thema === thema),
  );
}

export function fehlerIds(s: Stand): string[] {
  return FRAGEN.filter((f) => {
    const fs = s.fragen[f.id];
    return fs && fs.l === 0 && fs.f > 0;
  }).map((f) => f.id);
}

export function gemerktIds(s: Stand): string[] {
  return FRAGEN.filter((f) => s.fragen[f.id]?.m).map((f) => f.id);
}

/**
 * Kluge Auswahl fürs Training: erst falsch beantwortete, dann neue, dann
 * wacklige Fragen – innerhalb der Gruppen die am längsten nicht gesehenen.
 */
export function smartAuswahl(s: Stand, anzahl: number, liste: Frage[] = FRAGEN): string[] {
  const rang = (f: Frage) => {
    const fs = s.fragen[f.id];
    if (!fs) return 1;
    if (fs.l === 0 && fs.f > 0) return 0;
    return 2 + fs.box;
  };
  return [...liste]
    .map((f) => ({ f, rang: rang(f), t: s.fragen[f.id]?.t ?? 0, zufall: Math.random() }))
    .sort((x, y) => x.rang - y.rang || x.t - y.t || x.zufall - y.zufall)
    .slice(0, anzahl)
    .map((x) => x.f.id);
}

export function gemischt<T>(liste: T[]): T[] {
  const kopie = [...liste];
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
  }
  return kopie;
}

// ---------------------------------------------------------------------------
// Änderungen (rein – geben einen neuen Stand zurück)
// ---------------------------------------------------------------------------

function tagGelernt(s: Stand): Stand {
  const heute = tagKey();
  if (s.letzterTag === heute) return s;
  const serie = s.letzterTag === tagVerschoben(-1) ? s.serie + 1 : 1;
  return { ...s, serie, besteSerie: Math.max(s.besteSerie, serie), letzterTag: heute };
}

function xpDazu(s: Stand, xp: number): Stand {
  const heute = tagKey();
  return { ...s, xp: s.xp + xp, xpTage: { ...s.xpTage, [heute]: (s.xpTage[heute] ?? 0) + xp } };
}

function mitErfolgen(s: Stand, extra: string[] = []): { stand: Stand; neu: string[] } {
  const neu = ERFOLGE.filter((e) => !s.erfolge[e.id] && (extra.includes(e.id) || e.pruefen?.(s))).map((e) => e.id);
  if (neu.length === 0) return { stand: s, neu };
  const heute = tagKey();
  const erfolge = { ...s.erfolge };
  for (const id of neu) erfolge[id] = heute;
  return { stand: { ...s, erfolge }, neu };
}

// ---------------------------------------------------------------------------
// Kontext
// ---------------------------------------------------------------------------

type StandKontext = {
  stand: Stand;
  bereit: boolean;
  /** Antwort verbuchen; gibt die gutgeschriebenen XP zurück. */
  antwort: (id: string, richtig: boolean) => number;
  merken: (id: string) => void;
  trainingFertig: (richtig: number, gesamt: number) => void;
  pruefungFertig: (p: Omit<Pruefung, "datum">) => number;
  duellFertig: (ergebnis: "sieg" | "remis" | "niederlage", gegnerRating: number) => { xp: number; rating: number };
  setzen: (teil: Partial<Pick<Stand, "tagesziel" | "erinnerung" | "klasse">>) => void;
  gebuchtSetzen: (g: Stand["gebucht"]) => void;
  ersetzen: (s: Stand) => void;
  zuruecksetzen: () => void;
  neueErfolge: string[];
  erfolgeGesehen: () => void;
};

const Kontext = createContext<StandKontext | null>(null);

export function StandProvider({ children }: { children: ReactNode }) {
  const [stand, setStand] = useState<Stand>(LEER);
  const [bereit, setBereit] = useState(false);
  const [neueErfolge, setNeueErfolge] = useState<string[]>([]);
  const aktuell = useRef(stand);
  aktuell.current = stand;

  useEffect(() => {
    AsyncStorage.getItem(SPEICHER)
      .then((roh) => {
        if (roh) {
          const gelesen = JSON.parse(roh) as Partial<Stand>;
          setStand({ ...LEER, ...gelesen, duell: { ...LEER.duell, ...gelesen.duell }, gebucht: { ...LEER.gebucht, ...gelesen.gebucht } });
        }
      })
      .catch(() => {})
      .finally(() => setBereit(true));
  }, []);

  useEffect(() => {
    if (!bereit) return;
    const t = setTimeout(() => {
      AsyncStorage.setItem(SPEICHER, JSON.stringify(stand)).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [stand, bereit]);

  /** Neuen Stand übernehmen und dabei Erfolge prüfen. */
  const anwenden = useCallback((neu: Stand, extra: string[] = []) => {
    const { stand: mit, neu: erfolge } = mitErfolgen(neu, extra);
    aktuell.current = mit;
    setStand(mit);
    if (erfolge.length) setNeueErfolge((alt) => [...alt, ...erfolge]);
  }, []);

  const antwort = useCallback(
    (id: string, richtig: boolean) => {
      let s = aktuell.current;
      const alt = s.fragen[id] ?? { r: 0, f: 0, t: 0, box: 0, l: 0 as const };
      const neu: FrageStand = {
        ...alt,
        r: alt.r + (richtig ? 1 : 0),
        f: alt.f + (richtig ? 0 : 1),
        t: Date.now(),
        box: richtig ? Math.min(5, alt.box + 1) : 0,
        l: richtig ? 1 : 0,
      };
      s = { ...s, fragen: { ...s.fragen, [id]: neu } };
      const heute = tagKey();
      const vorher = s.antwortenTage[heute] ?? 0;
      s = { ...s, antwortenTage: { ...s.antwortenTage, [heute]: vorher + 1 } };
      s = tagGelernt(s);
      let xp = richtig ? 10 : 2;
      // Bonus, sobald das Tagesziel erreicht ist
      if (vorher < s.tagesziel && vorher + 1 >= s.tagesziel) xp += 25;
      s = xpDazu(s, xp);
      const extra = new Date().getHours() >= 22 ? ["nacht"] : [];
      anwenden(s, extra);
      return xp;
    },
    [anwenden],
  );

  const merken = useCallback(
    (id: string) => {
      const s = aktuell.current;
      const alt = s.fragen[id] ?? { r: 0, f: 0, t: 0, box: 0, l: 0 as const };
      anwenden({ ...s, fragen: { ...s.fragen, [id]: { ...alt, m: !alt.m } } });
    },
    [anwenden],
  );

  const trainingFertig = useCallback(
    (richtig: number, gesamt: number) => {
      if (gesamt >= 10 && richtig === gesamt) anwenden(aktuell.current, ["sauber"]);
    },
    [anwenden],
  );

  const pruefungFertig = useCallback(
    (p: Omit<Pruefung, "datum">) => {
      let s = aktuell.current;
      const xp = p.bestanden ? 60 : 20;
      s = { ...s, pruefungen: [{ ...p, datum: new Date().toISOString() }, ...s.pruefungen].slice(0, 30) };
      s = xpDazu(tagGelernt(s), xp);
      anwenden(s);
      return xp;
    },
    [anwenden],
  );

  const duellFertig = useCallback(
    (ergebnis: "sieg" | "remis" | "niederlage", gegnerRating: number) => {
      let s = aktuell.current;
      const erwartet = 1 / (1 + Math.pow(10, (gegnerRating - s.duell.rating) / 400));
      const wert = ergebnis === "sieg" ? 1 : ergebnis === "remis" ? 0.5 : 0;
      const aenderung = Math.round(28 * (wert - erwartet));
      const xp = ergebnis === "sieg" ? 30 : ergebnis === "remis" ? 15 : 5;
      s = {
        ...s,
        duell: {
          rating: Math.max(100, s.duell.rating + aenderung),
          siege: s.duell.siege + (ergebnis === "sieg" ? 1 : 0),
          niederlagen: s.duell.niederlagen + (ergebnis === "niederlage" ? 1 : 0),
          remis: s.duell.remis + (ergebnis === "remis" ? 1 : 0),
        },
      };
      anwenden(xpDazu(tagGelernt(s), xp));
      return { xp, rating: aenderung };
    },
    [anwenden],
  );

  const setzen = useCallback(
    (teil: Partial<Pick<Stand, "tagesziel" | "erinnerung" | "klasse">>) => anwenden({ ...aktuell.current, ...teil }),
    [anwenden],
  );

  const gebuchtSetzen = useCallback((g: Stand["gebucht"]) => {
    const s = { ...aktuell.current, gebucht: g };
    aktuell.current = s;
    setStand(s);
  }, []);

  const ersetzen = useCallback((s: Stand) => {
    const neu = { ...LEER, ...s };
    aktuell.current = neu;
    setStand(neu);
  }, []);

  const zuruecksetzen = useCallback(() => {
    // Punkte in der Rangliste bleiben erhalten; neue XP werden ab 0 weiter gemeldet.
    const neu = { ...LEER, klasse: aktuell.current.klasse, tagesziel: aktuell.current.tagesziel, erinnerung: aktuell.current.erinnerung };
    aktuell.current = neu;
    setStand(neu);
  }, []);

  const wert = useMemo<StandKontext>(
    () => ({
      stand,
      bereit,
      antwort,
      merken,
      trainingFertig,
      pruefungFertig,
      duellFertig,
      setzen,
      gebuchtSetzen,
      ersetzen,
      zuruecksetzen,
      neueErfolge,
      erfolgeGesehen: () => setNeueErfolge([]),
    }),
    [stand, bereit, antwort, merken, trainingFertig, pruefungFertig, duellFertig, setzen, gebuchtSetzen, ersetzen, zuruecksetzen, neueErfolge],
  );

  return <Kontext.Provider value={wert}>{children}</Kontext.Provider>;
}

export function useStand(): StandKontext {
  const k = useContext(Kontext);
  if (!k) throw new Error("useStand außerhalb von StandProvider");
  return k;
}
