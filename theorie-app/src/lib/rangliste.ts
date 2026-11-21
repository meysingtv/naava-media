import { supabase } from "./supabase";
import { wochenStart } from "./stand";

export type RangEintrag = { platz: number; id: string; name: string; benutzername: string; xp: number; ich: boolean };

/** Echte Wochen-Rangliste vom Server (optional nur ein Bundesland) – `null`, wenn nicht erreichbar. */
export async function ranglisteLaden(eigeneId: string, bundesland: string | null = null): Promise<RangEintrag[] | null> {
  const { data, error } = await supabase.rpc("lern_rangliste", { p_bundesland: bundesland });
  if (error || !Array.isArray(data)) return null;
  return (data as { platz: number; id: string; name: string; benutzername: string; xp_woche: number }[]).map((z) => ({
    platz: Number(z.platz),
    id: z.id,
    name: z.name || z.benutzername,
    benutzername: z.benutzername,
    xp: z.xp_woche,
    ich: z.id === eigeneId,
  }));
}

// Kleiner, vorhersagbarer Zufall – gleiche Woche, gleiche Liste.
function zufall(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NAMEN = ["Mia", "Jonas", "Lea", "Ben", "Emir", "Sophie", "Luca", "Hannah", "Noah", "Elif", "Paul", "Amelie", "Finn", "Lina"];

/** Übungs-Rangliste für den Gastmodus: typische Wochenwerte plus du. */
export function demoRangliste(ich: { name: string; xp: number }, regional = false): RangEintrag[] {
  const start = wochenStart();
  const r = zufall(start.getFullYear() * 1000 + start.getMonth() * 40 + start.getDate() + (regional ? 7 : 0));
  // Wochentag bestimmt, wie weit die anderen schon sind.
  const fortschritt = (((new Date().getDay() + 6) % 7) + 1) / 7;
  const andere = (regional ? NAMEN.slice(3, 10) : NAMEN.slice(0, 11)).map((name, i) => ({
    name,
    xp: Math.round((1400 - i * 105 + r() * 160) * fortschritt),
  }));
  const alle = [...andere.map((a) => ({ ...a, ich: false })), { name: ich.name, xp: ich.xp, ich: true }].sort((x, y) => y.xp - x.xp);
  return alle.map((e, i) => ({
    platz: i + 1,
    id: e.ich ? "ich" : `demo-${e.name}`,
    name: e.name,
    benutzername: e.name.toLowerCase(),
    xp: e.xp,
    ich: e.ich,
  }));
}

/** Liga nach Gesamt-XP – benannt nach Straßenarten. */
export function ligaVon(xpGesamt: number): { name: string; naechste: string | null; bis: number | null; farbe: string } {
  if (xpGesamt >= 6000) return { name: "Autobahn-Liga", naechste: null, bis: null, farbe: "#64ACFF" };
  if (xpGesamt >= 2000) return { name: "Bundesstraßen-Liga", naechste: "Autobahn-Liga", bis: 6000, farbe: "#FFC857" };
  return { name: "Landstraßen-Liga", naechste: "Bundesstraßen-Liga", bis: 2000, farbe: "#F47B45" };
}
