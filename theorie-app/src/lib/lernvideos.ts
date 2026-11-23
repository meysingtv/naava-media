import { useMemo } from "react";

import { ANIMATION_TITEL, animationZuLage } from "./erklaer-animationen";
import { useErklaervideos } from "./erklaervideos";
import { fragenZuThema, THEMEN } from "./fragen";
import { FRAGEN_AKTIV } from "./funktionen";
import { useThemenvideos } from "./themenvideos";

/**
 * Alles, was sich zu einem Thema ansehen lässt, ohne die Fragen zu zeigen:
 * Themenvideos aus dem Manager, Erklärvideos zu einzelnen Fragen und die
 * eingebauten Animationen. Abgespielt wird alles auf /themavideo.
 */

export type Lernvideo = {
  schluessel: string;
  art: "thema" | "frage" | "animation";
  titel: string;
  dauer: number | null;
  /** Parameter für /themavideo. */
  params: { id?: string; frage?: string; lage?: string };
};

export type LernvideoStand = { geladen: boolean; zuThema: (thema: string) => Lernvideo[] };

/**
 * Videos je Thema; `zuThema` liefert die Liste eines Themas. Die Themen legt der
 * Inhaber im Manager an (lern_thema). Solange die Prüfungsfragen an sind, hängen
 * an den alten festen Themen zusätzlich Erklärvideos und Animationen der Fragen.
 */
export function useLernvideos(): LernvideoStand {
  const themen = useThemenvideos();
  const fragen = useErklaervideos();
  return useMemo(() => {
    const karte = new Map<string, Lernvideo[]>();
    for (const v of themen.videos) {
      const liste = karte.get(v.thema_id) ?? [];
      liste.push({ schluessel: `t-${v.id}`, art: "thema", titel: v.titel, dauer: v.dauer, params: { id: v.id } });
      karte.set(v.thema_id, liste);
    }
    if (FRAGEN_AKTIV) {
      for (const t of THEMEN) {
        const liste = karte.get(t.id) ?? [];
        let nr = 0;
        const lagen = new Set<string>();
        for (const q of fragenZuThema(t.id)) {
          const v = fragen.videos[q.id];
          if (v) {
            nr += 1;
            liste.push({ schluessel: `f-${q.id}`, art: "frage", titel: `${t.titel} · Erklärvideo ${nr}`, dauer: v.dauer, params: { frage: q.id } });
          }
          const lage = q.bild;
          if (lage && !lagen.has(lage) && animationZuLage(lage)) {
            lagen.add(lage);
            liste.push({ schluessel: `a-${lage}`, art: "animation", titel: ANIMATION_TITEL[lage] ?? "Animation", dauer: null, params: { lage } });
          }
        }
        karte.set(t.id, liste);
      }
    }
    return { geladen: themen.geladen && fragen.geladen, zuThema: (id: string) => karte.get(id) ?? [] };
  }, [themen, fragen]);
}
