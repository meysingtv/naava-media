import { ZEICHEN_INFO, type ZeichenInfo } from "@/components/zeichen";

import { frageVon, THEMEN, themaVon, type Frage, type ThemaId, type ZeichenKey } from "./fragen";
import { gemischt, KARTE_SICHER, karteFaellig, tagKey, type Stand } from "./stand";

/**
 * Karteikarten: Karten aus Fragen („Karteikarte“ unter einer Frage), eigene
 * Karten und ein eingebauter Stapel mit allen Verkehrszeichen. Gelernt wird
 * nach dem Lernfach-Prinzip (Leitner): gewusst → längere Pause, nicht
 * gewusst → morgen … heute noch einmal.
 */

export type StapelId = "eigen" | "zeichen" | `t:${ThemaId}`;
/** Was gelernt wird: alle fälligen Karten oder ein Stapel. */
export type LernAuswahl = StapelId | "heute";

export type KartenInhalt =
  | { id: string; art: "frage"; frage: Frage }
  | { id: string; art: "eigen"; vorne: string; hinten: string; zeichen?: ZeichenKey }
  | { id: string; art: "zeichen"; info: ZeichenInfo };

/** Höchstens so viele Karten je Runde – danach kurz durchatmen. */
export const RUNDE = 30;
/** Neue Zeichen-Karten je Runde – der eingebaute Stapel soll nicht erschlagen. */
const NEU_ZEICHEN_JE_RUNDE = 10;

export const zeichenKarteId = (key: ZeichenKey) => `z:${key}`;

const ZEICHEN_IDS = ZEICHEN_INFO.map((z) => zeichenKarteId(z.key));

export function karteInhalt(s: Stand, id: string): KartenInhalt | null {
  if (id.startsWith("z:")) {
    const info = ZEICHEN_INFO.find((z) => z.key === id.slice(2));
    return info ? { id, art: "zeichen", info } : null;
  }
  const k = s.karteikarten.karten.find((x) => x.id === id);
  if (!k) return null;
  if (k.art === "frage") {
    const frage = frageVon(k.frageId);
    return frage ? { id, art: "frage", frage } : null;
  }
  return { id, art: "eigen", vorne: k.vorne, hinten: k.hinten, zeichen: k.zeichen };
}

/** Eingebaute Karte? Die kann man lernen, aber nicht löschen. */
export function istEingebaut(id: string): boolean {
  return id.startsWith("z:");
}

// ---------------------------------------------------------------------------
// Stapel
// ---------------------------------------------------------------------------

export type Stapel = {
  id: StapelId;
  titel: string;
  unter: string;
  ids: string[];
  /** Heute zu wiederholen (schon einmal gelernt). */
  faellig: number;
  /** Noch nie gelernt. */
  neu: number;
  /** Sitzen (ab Fach 3). */
  sicher: number;
};

function themaVonKarte(s: Stand, id: string): ThemaId | undefined {
  const k = s.karteikarten.karten.find((x) => x.id === id);
  return k?.art === "frage" ? frageVon(k.frageId)?.thema : undefined;
}

/** Karten eines Stapels – neueste zuerst, Zeichen in Katalog-Reihenfolge. */
export function stapelIds(s: Stand, id: StapelId): string[] {
  if (id === "zeichen") return ZEICHEN_IDS;
  const karten = [...s.karteikarten.karten].sort((a, b) => b.erstellt.localeCompare(a.erstellt));
  if (id === "eigen") return karten.filter((k) => k.art === "eigen").map((k) => k.id);
  const thema = id.slice(2) as ThemaId;
  return karten.filter((k) => k.art === "frage" && frageVon(k.frageId)?.thema === thema).map((k) => k.id);
}

export function stapelTitel(id: StapelId): string {
  if (id === "eigen") return "Meine Karten";
  if (id === "zeichen") return "Verkehrszeichen";
  return themaVon(id.slice(2) as ThemaId).titel;
}

export function kartenStatus(s: Stand, id: string, heute = tagKey()): "neu" | "faellig" | "spaeter" {
  const f = s.karteikarten.faecher[id];
  if (!f) return "neu";
  return f.faellig <= heute ? "faellig" : "spaeter";
}

function stapelVon(s: Stand, id: StapelId, heute: string): Stapel {
  const ids = stapelIds(s, id);
  let faellig = 0;
  let neu = 0;
  let sicher = 0;
  for (const k of ids) {
    const st = kartenStatus(s, k, heute);
    if (st === "neu") neu++;
    else if (st === "faellig") faellig++;
    if ((s.karteikarten.faecher[k]?.fach ?? 0) >= KARTE_SICHER) sicher++;
  }
  const teile = [`${ids.length} ${ids.length === 1 ? "Karte" : "Karten"}`];
  if (id === "zeichen" && neu < ids.length) teile.push(`${ids.length - neu} begonnen`);
  if (faellig > 0) teile.push(`${faellig} fällig`);
  if (neu > 0 && id !== "zeichen") teile.push(`${neu} neu`);
  return { id, titel: stapelTitel(id), unter: teile.join(" · "), ids, faellig, neu, sicher };
}

/** Alle Stapel: eigene Karten, je Thema die Karten aus Fragen, dann die Verkehrszeichen. */
export function stapelListe(s: Stand, heute = tagKey()): Stapel[] {
  const liste: Stapel[] = [stapelVon(s, "eigen", heute)];
  const themen = new Set(s.karteikarten.karten.map((k) => themaVonKarte(s, k.id)).filter(Boolean));
  for (const t of THEMEN) if (themen.has(t.id)) liste.push(stapelVon(s, `t:${t.id}`, heute));
  liste.push(stapelVon(s, "zeichen", heute));
  return liste;
}

export function stapelInfo(s: Stand, id: StapelId, heute = tagKey()): Stapel {
  return stapelVon(s, id, heute);
}

/** Eigene und aus Fragen erstellte Karten, deren Frage es noch gibt. */
function eigeneIds(s: Stand): string[] {
  return s.karteikarten.karten.filter((k) => k.art === "eigen" || frageVon(k.frageId)).map((k) => k.id);
}

/**
 * Heute dran: eigene Karten, die fällig oder neu sind, und Zeichen-Karten,
 * die schon einmal gelernt wurden und wieder fällig sind.
 */
export function heuteDran(s: Stand, heute = tagKey()): { gesamt: number; neu: number; wiederholen: number } {
  let neu = 0;
  let wiederholen = 0;
  for (const id of eigeneIds(s)) {
    const st = kartenStatus(s, id, heute);
    if (st === "neu") neu++;
    else if (st === "faellig") wiederholen++;
  }
  for (const id of ZEICHEN_IDS) if (kartenStatus(s, id, heute) === "faellig") wiederholen++;
  return { gesamt: neu + wiederholen, neu, wiederholen };
}

/** Wie viele Karten gibt es insgesamt (ohne die eingebauten) – und wie viele sitzen? */
export function kartenZahlen(s: Stand): { eigene: number; sicher: number; gelernt: number } {
  const ids = eigeneIds(s);
  let sicher = 0;
  for (const [id, f] of Object.entries(s.karteikarten.faecher)) if (f.fach >= KARTE_SICHER && (id.startsWith("z:") || ids.includes(id))) sicher++;
  return { eigene: ids.length, sicher, gelernt: Object.keys(s.karteikarten.faecher).length };
}

/**
 * Fällige zuerst (schwächstes Fach vorn), dann neue: eigene Karten in der
 * Reihenfolge, in der sie entstanden sind, Zeichen in Katalog-Reihenfolge.
 */
function sortieren(s: Stand, ids: string[], heute: string, neuMax = Infinity): string[] {
  const fach = (id: string) => s.karteikarten.faecher[id]?.fach ?? 0;
  const faellig = gemischt(ids.filter((id) => kartenStatus(s, id, heute) === "faellig")).sort((a, b) => fach(a) - fach(b));
  const alter = (id: string) => s.karteikarten.karten.find((k) => k.id === id)?.erstellt ?? "";
  const neu = ids.filter((id) => kartenStatus(s, id, heute) === "neu").sort((a, b) => alter(a).localeCompare(alter(b)));
  return [...faellig, ...neu.slice(0, neuMax)];
}

/**
 * Karten für eine Lernrunde. `alle` geht einen Stapel komplett durch (gemischt),
 * auch Karten, die noch nicht fällig sind – ohne Punkte, die Fächer bleiben.
 */
export function lernListe(s: Stand, auswahl: LernAuswahl, alle = false, heute = tagKey()): string[] {
  if (auswahl === "heute") {
    const eigene = sortieren(s, eigeneIds(s), heute);
    const zeichen = sortieren(s, ZEICHEN_IDS, heute, 0);
    return [...eigene, ...zeichen].slice(0, RUNDE);
  }
  const ids = stapelIds(s, auswahl).filter((id) => karteInhalt(s, id));
  if (alle) return gemischt(ids).slice(0, RUNDE);
  return sortieren(s, ids, heute, auswahl === "zeichen" ? NEU_ZEICHEN_JE_RUNDE : Infinity).slice(0, RUNDE);
}

// ---------------------------------------------------------------------------
// Texte
// ---------------------------------------------------------------------------

function tageBis(tag: string, heute = tagKey()): number {
  const [j, m, t] = tag.split("-").map(Number);
  const [hj, hm, ht] = heute.split("-").map(Number);
  return Math.round((new Date(j, m - 1, t).getTime() - new Date(hj, hm - 1, ht).getTime()) / 86_400_000);
}

/** „Neu“, „Heute“, „Morgen“, „In 3 Tagen“, „In 2 Wochen“ … */
export function naechsteText(s: Stand, id: string): string {
  const f = s.karteikarten.faecher[id];
  if (!f) return "Neu";
  if (karteFaellig(s, id)) return "Heute dran";
  const tage = tageBis(f.faellig);
  if (tage === 1) return "Morgen";
  if (tage < 14) return `In ${tage} Tagen`;
  if (tage < 60) return `In ${Math.round(tage / 7)} Wochen`;
  return `In ${Math.round(tage / 30)} Monaten`;
}

/** Wann die nächste Karte wieder dran ist: „morgen“, „in 3 Tagen“ – oder null. */
export function naechsteRunde(s: Stand, heute = tagKey()): string | null {
  const eigene = new Set(eigeneIds(s));
  let min: string | null = null;
  for (const [id, f] of Object.entries(s.karteikarten.faecher)) {
    if (!id.startsWith("z:") && !eigene.has(id)) continue;
    if (f.faellig > heute && (min == null || f.faellig < min)) min = f.faellig;
  }
  if (min == null) return null;
  const tage = tageBis(min, heute);
  return tage <= 1 ? "morgen" : `in ${tage} Tagen`;
}

/** Kurzer Text für die Vorderseite in Listen. */
export function vorneText(inhalt: KartenInhalt): string {
  if (inhalt.art === "frage") return inhalt.frage.text;
  if (inhalt.art === "zeichen") return inhalt.info.name;
  return inhalt.vorne;
}

export const GRUPPE_TITEL: Record<ZeichenInfo["gruppe"], string> = {
  gefahr: "Gefahrzeichen",
  vorschrift: "Vorschriftzeichen",
  richt: "Richtzeichen",
};
