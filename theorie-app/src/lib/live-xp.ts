import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { frageVon } from "@/lib/fragen";
import type { LiveQuiz, QuizMeins } from "@/lib/live-quiz";
import { istBeantwortet, type LivePruefung, type PruefungMeins } from "@/lib/live-pruefung";
import { useStand } from "@/lib/stand";

// XP fürs Mitspielen im Live: Quizfragen und Live-Prüfungen zählen wie Lernen
// (Antworten landen im Lernstand, die Prüfung in der Prüfungs-Liste). Jede
// Runde gibt es nur einmal – auch nach einem Neustart der App, denn die schon
// gebuchten Runden liegen auf dem Handy.

const SPEICHER = "live-xp-v1";
const MAX_EINTRAEGE = 120;
/** Extra für eine Live-Prüfung ohne einen Fehlerpunkt. */
export const XP_FEHLERFREI = 40;

let gebucht: Record<string, number> | null = null;
let laden: Promise<Record<string, number>> | null = null;
const hoerer = new Set<() => void>();

function gebuchtLaden(): Promise<Record<string, number>> {
  if (gebucht) return Promise.resolve(gebucht);
  laden ??= AsyncStorage.getItem(SPEICHER)
    .then((w) => {
      const g: unknown = w ? JSON.parse(w) : null;
      return g && typeof g === "object" ? (g as Record<string, number>) : {};
    })
    .catch(() => ({}) as Record<string, number>)
    .then((g) => {
      gebucht = g;
      return g;
    });
  return laden;
}

/** Bucht die XP einer Runde genau einmal; gibt die (schon) gebuchten XP zurück. */
async function einmal(id: string, rechnen: () => number): Promise<number> {
  const g = await gebuchtLaden();
  if (id in g) return g[id];
  const xp = rechnen();
  const neu = Object.fromEntries([...Object.entries(g), [id, xp] as const].slice(-MAX_EINTRAEGE));
  gebucht = neu;
  AsyncStorage.setItem(SPEICHER, JSON.stringify(neu)).catch(() => {});
  hoerer.forEach((h) => h());
  return xp;
}

export function useLiveXp(): {
  /** Gebuchte XP einer Quizfrage oder Prüfung, sonst null. */
  xpVon: (art: "quiz" | "pruefung", id: string | null | undefined) => number | null;
  /** Quizfrage nach der Auflösung verbuchen: wie eine Lernfrage plus Tempo-Bonus. */
  quizBuchen: (quiz: LiveQuiz, mein: QuizMeins) => void;
  /** Abgegebene Prüfung verbuchen: jede beantwortete Frage plus Prüfung, fehlerfrei mit Extra. */
  pruefungBuchen: (pruefung: LivePruefung, mein: PruefungMeins) => void;
} {
  const { bereit, antwort, bonus, pruefungFertig } = useStand();
  const [, setZaehler] = useState(0);

  useEffect(() => {
    const h = () => setZaehler((z) => z + 1);
    hoerer.add(h);
    if (!gebucht) gebuchtLaden().then(h);
    return () => {
      hoerer.delete(h);
    };
  }, []);

  const xpVon = useCallback((art: "quiz" | "pruefung", id: string | null | undefined) => {
    const schluessel = `${art}-${id}`;
    return id && gebucht && schluessel in gebucht ? gebucht[schluessel] : null;
  }, []);

  const quizBuchen = useCallback(
    (quiz: LiveQuiz, mein: QuizMeins) => {
      if (!bereit || mein.richtig == null) return;
      einmal(`quiz-${quiz.id}`, () => {
        const richtig = mein.richtig === true;
        // Schnell und richtig: bis zu 10 XP extra (Quiz-Punkte 500–1000).
        const tempo = richtig ? Math.max(0, Math.round((mein.punkte - 500) / 50)) : 0;
        if (frageVon(quiz.frage_id)) {
          const xp = antwort(quiz.frage_id, richtig);
          if (tempo) bonus(tempo);
          return xp + tempo;
        }
        const xp = (richtig ? 10 : 2) + tempo;
        bonus(xp);
        return xp;
      });
    },
    [bereit, antwort, bonus],
  );

  const pruefungBuchen = useCallback(
    (pruefung: LivePruefung, mein: PruefungMeins) => {
      if (!bereit || !mein.abgegeben || mein.fehlerpunkte == null || mein.bestanden == null) return;
      einmal(`pruefung-${pruefung.id}`, () => {
        const falsch = new Set(mein.falsch ?? []);
        let xp = 0;
        let beantwortet = 0;
        pruefung.fragen.forEach((id, i) => {
          const frage = frageVon(id);
          if (!frage || !istBeantwortet(frage, mein.antworten?.[String(i)])) return;
          beantwortet += 1;
          xp += antwort(id, !falsch.has(i));
        });
        // Nichts angekreuzt (z. B. Zeit lief ab, ohne mitzuschreiben): keine XP.
        if (!beantwortet) return 0;
        xp += pruefungFertig({ fehlerpunkte: mein.fehlerpunkte ?? 0, bestanden: Boolean(mein.bestanden), richtig: mein.richtig ?? 0, gesamt: pruefung.fragen.length });
        if (mein.fehlerpunkte === 0 && beantwortet === pruefung.fragen.length) {
          bonus(XP_FEHLERFREI);
          xp += XP_FEHLERFREI;
        }
        return xp;
      });
    },
    [bereit, antwort, bonus, pruefungFertig],
  );

  return { xpVon, quizBuchen, pruefungBuchen };
}
