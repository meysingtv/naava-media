import { lernstoffAntwort } from "./ki-hilfe";
import { FRAGEN, THEMEN, themaVon, type ThemaId } from "./fragen";
import { tageBis, terminDatum } from "./pruefungstag";
import { fehlerIds, fortschritt, heuteBeantwortet, serieAktuell, type Stand } from "./stand";
import { serverVerbunden, supabase } from "./supabase";

// KI-Seite: freier Chat über die Server-Funktion „ki-hilfe“ (art „chat“). Die
// KI bekommt einen kurzen Lernstand mit und darf am Ende Knöpfe vorschlagen
// ([[aktion:…]]), die die App in echte Knöpfe verwandelt. Ohne Server
// antwortet die App aus dem eigenen Lernstoff.

export type KiAktion =
  | { art: "smart" }
  | { art: "fehler" }
  | { art: "thema"; thema: ThemaId }
  | { art: "pruefung" }
  | { art: "karteikarten" }
  | { art: "schilder" }
  | { art: "formeln" }
  | { art: "statistik" }
  | { art: "termin" };

export type ChatNachricht = { id: string; rolle: "ich" | "ki"; text: string; aktionen?: KiAktion[]; quelle?: "ki" | "lernstoff" };

export const VORSCHLAEGE = [
  { symbol: "✦", text: "Plan für heute", frage: "Was soll ich heute lernen?" },
  { symbol: "↯", text: "Quiz aus Fehlern", frage: "Mach mir ein Quiz aus meinen Fehlern" },
  { symbol: "≡", text: "Vorfahrt erklären", frage: "Erklär mir kurz die Vorfahrtsregeln" },
  { symbol: "?", text: "Rechts vor links", frage: "Wann gilt rechts vor links?" },
] as const;

/** Beschriftung eines Aktionsknopfs. */
export function aktionTitel(a: KiAktion): string {
  switch (a.art) {
    case "smart":
      return "Smart lernen starten";
    case "fehler":
      return "Fehler üben";
    case "thema":
      return `${themaVon(a.thema).titel} üben`;
    case "pruefung":
      return "Prüfung simulieren";
    case "karteikarten":
      return "Karteikarten öffnen";
    case "schilder":
      return "Schilder-Jagd starten";
    case "formeln":
      return "Formeln ansehen";
    case "statistik":
      return "Meinen Fortschritt ansehen";
    case "termin":
      return "Prüfungstermin eintragen";
  }
}

const THEMA_IDS = new Set<string>(THEMEN.map((t) => t.id));

/** [[aktion:…]] aus der Antwort lösen; nur bekannte Aktionen werden Knöpfe. */
export function aktionenLesen(roh: string): { text: string; aktionen: KiAktion[] } {
  const aktionen: KiAktion[] = [];
  const text = roh
    .replace(/\[\[aktion:([a-z_]+)(?::([a-z0-9_-]+))?\]\]/gi, (_, art: string, wert?: string) => {
      const a = art.toLowerCase();
      if (a === "thema" && wert && THEMA_IDS.has(wert)) aktionen.push({ art: "thema", thema: wert as ThemaId });
      else if (["smart", "fehler", "pruefung", "karteikarten", "schilder", "formeln", "statistik", "termin"].includes(a)) aktionen.push({ art: a } as KiAktion);
      return "";
    })
    .replace(/[ \t]+\n/g, "\n")
    .trim();
  const eindeutig = aktionen.filter((a, i) => aktionen.findIndex((b) => JSON.stringify(b) === JSON.stringify(a)) === i).slice(0, 2);
  return { text, aktionen: eindeutig };
}

/** Schwächste begonnene Themen zuerst. */
function themenStand(stand: Stand) {
  return THEMEN.map((t) => {
    const liste = FRAGEN.filter((q) => q.thema === t.id);
    const p = fortschritt(stand, liste);
    return { id: t.id, titel: t.titel, anteil: p.anteil, begonnen: liste.some((q) => stand.fragen[q.id]) };
  }).sort((a, b) => Number(b.begonnen) - Number(a.begonnen) || a.anteil - b.anteil);
}

/** Kurzer Lernstand für die KI (keine persönlichen Daten außer dem Vornamen). */
export function lernstandText(stand: Stand, vorname: string): string {
  const gesamt = fortschritt(stand);
  const termin = terminDatum(stand.pruefungstermin);
  const tage = termin ? tageBis(termin) : null;
  const letzte = stand.pruefungen[0];
  const schwach = themenStand(stand)
    .filter((t) => t.begonnen)
    .slice(0, 3)
    .map((t) => `${t.titel} (${t.id}, ${Math.round(t.anteil * 100)} % sicher)`);
  const zeilen = [
    vorname ? `Vorname: ${vorname}` : null,
    `Führerscheinklasse: ${stand.klasse}`,
    `Sicher beantwortet: ${gesamt.richtig} von ${gesamt.gesamt} Fragen (${Math.round(gesamt.anteil * 100)} %)`,
    `Fragen mit Fehlern zum Üben: ${fehlerIds(stand).length}`,
    `Heute: ${heuteBeantwortet(stand)} von ${stand.tagesziel} Fragen (Tagesziel), Serie: ${serieAktuell(stand)} Tage`,
    tage === null ? "Prüfungstermin: noch nicht eingetragen" : tage >= 0 ? `Prüfung in ${tage} Tagen` : "Prüfungstermin liegt in der Vergangenheit",
    letzte ? `Letzte Prüfungssimulation: ${letzte.fehlerpunkte} Fehlerpunkte, ${letzte.bestanden ? "bestanden" : "nicht bestanden"}` : "Noch keine Prüfungssimulation",
    schwach.length ? `Schwächste Themen: ${schwach.join(", ")}` : "Noch keine Themen begonnen",
  ];
  return zeilen.filter(Boolean).join("\n");
}

// ---------------------------------------------------------------------------
// Ohne Server: Antworten aus dem Lernstand und dem Lernstoff
// ---------------------------------------------------------------------------

function normal(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function lokal(frage: string, stand: Stand, vorname: string): { text: string; aktionen: KiAktion[] } {
  const n = normal(frage);
  const fehler = fehlerIds(stand).length;
  const schwach = themenStand(stand).find((t) => t.begonnen && t.anteil < 1) ?? themenStand(stand)[0];

  if (/(heute|plan|was soll ich|womit|anfangen)/.test(n) && /(lern|plan|ueben|machen)/.test(n)) {
    const rest = Math.max(0, stand.tagesziel - heuteBeantwortet(stand));
    const termin = terminDatum(stand.pruefungstermin);
    const tage = termin ? tageBis(termin) : null;
    const teile = [
      rest > 0 ? `${vorname ? `${vorname}, heute` : "Heute"} fehlen dir noch **${rest} Fragen** bis zum Tagesziel.` : "Dein Tagesziel hast du heute schon geschafft – stark!",
      schwach ? `Am meisten bringt dir gerade **${schwach.titel}** – da bist du bei ${Math.round(schwach.anteil * 100)} %.` : null,
      fehler > 0 ? `Und ${fehler} Fragen hattest du schon mal falsch – die lohnen sich zum Wiederholen.` : null,
      tage !== null && tage >= 0 && tage <= 14 ? `Bis zur Prüfung sind es nur noch ${tage} Tage – mach heute auch eine Prüfungssimulation.` : null,
    ];
    return { text: teile.filter(Boolean).join(" "), aktionen: [schwach ? { art: "thema", thema: schwach.id } : { art: "smart" }, fehler > 0 ? { art: "fehler" } : { art: "smart" }] };
  }
  if (/fehler/.test(n) && /(quiz|ueben|wiederhol|test)/.test(n)) {
    if (fehler === 0) return { text: "Du hast gerade keine offenen Fehler – sehr gut! Ich stelle dir stattdessen die Fragen zusammen, die dich jetzt am meisten weiterbringen.", aktionen: [{ art: "smart" }] };
    return { text: `Du hast **${fehler} Fragen**, die du schon mal falsch hattest. Genau die üben wir jetzt – so lange, bis sie sitzen.`, aktionen: [{ art: "fehler" }] };
  }
  if (/vorfahrt|rechts vor links/.test(n)) {
    const antwort = lernstoffAntwort(frage) ?? lernstoffAntwort("rechts vor links");
    return {
      text:
        antwort ??
        "Die Reihenfolge: **Polizei vor Ampel, Ampel vor Schildern, Schilder vor „rechts vor links“.** Gibt es nichts davon, hat immer das Fahrzeug von rechts Vorfahrt.",
      aktionen: [{ art: "thema", thema: "vorfahrt" }],
    };
  }
  const antwort = lernstoffAntwort(frage);
  if (antwort) return { text: antwort, aktionen: [] };
  if (n.split(" ").length <= 3 && /^(hallo|hi|hey|moin|servus|guten)/.test(n)) return { text: `Hey${vorname ? ` ${vorname}` : ""}! Frag mich alles rund um deine Theorieprüfung.`, aktionen: [] };
  return {
    text: "Dazu habe ich gerade keine Antwort – ohne Verbindung zur KI kenne ich nur den Lernstoff. Frag mich zum Beispiel „Wie lang ist der Bremsweg bei 100?“ oder „Wann gilt rechts vor links?“.",
    aktionen: [],
  };
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

let serverAusBis = 0;

/** Antwort auf die letzte eigene Nachricht. */
export async function kiChatAntwort(verlauf: ChatNachricht[], stand: Stand, vorname: string): Promise<ChatNachricht> {
  const id = `ki-${Date.now()}`;
  const letzte = [...verlauf].reverse().find((m) => m.rolle === "ich")?.text ?? "";
  const lokalAntwort = (vorspann = ""): ChatNachricht => {
    const l = lokal(letzte, stand, vorname);
    return { id, rolle: "ki", text: vorspann + l.text, aktionen: l.aktionen, quelle: "lernstoff" };
  };

  if (!serverVerbunden || Date.now() < serverAusBis) return lokalAntwort();
  const { data: sitzung } = await supabase.auth.getSession();
  if (!sitzung.session) return lokalAntwort();

  const body = {
    art: "chat",
    lernstand: lernstandText(stand, vorname),
    verlauf: verlauf.slice(-12).map((m) => ({ rolle: m.rolle === "ich" ? "user" : "assistant", text: m.text })),
  };
  try {
    const antwort = await Promise.race([
      supabase.functions.invoke<{ text?: string }>("ki-hilfe", { body }),
      new Promise<"zeit">((fertig) => setTimeout(() => fertig("zeit"), 45000)),
    ]);
    if (antwort === "zeit") return lokalAntwort();
    const { data, error } = antwort;
    if (error) {
      const status = (error as { context?: { status?: number } }).context?.status;
      if (status === 429) return lokalAntwort("Für heute hast du die KI schon oft gefragt – morgen geht es weiter. Bis dahin aus dem Lernstoff:\n\n");
      if (status === 404 || status === 401 || status === 503) serverAusBis = Date.now() + 10 * 60 * 1000;
      return lokalAntwort();
    }
    if (!data?.text) return lokalAntwort();
    const { text, aktionen } = aktionenLesen(data.text);
    return { id, rolle: "ki", text, aktionen, quelle: "ki" };
  } catch {
    return lokalAntwort();
  }
}
