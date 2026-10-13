import AsyncStorage from "@react-native-async-storage/async-storage";

import { LEUCHTE_NAME } from "@/components/leuchten";
import { ZEICHEN_INFO } from "@/components/zeichen";

import { CLIPS } from "./clips";
import { FRAGEN, themaVon, zahlText, type Frage, type LeuchteKey, type ThemaId } from "./fragen";
import { serverVerbunden, supabase } from "./supabase";

/**
 * KI-Hilfe unter einer Frage: erklärt die Frage oder beantwortet freie Fragen.
 * Ist auf dem Server die Funktion „ki-hilfe“ eingerichtet (supabase/functions),
 * antwortet dort eine KI – der API-Schlüssel liegt nur auf dem Server. Sonst
 * (Gastmodus, offline, nicht eingerichtet) antwortet die App aus dem eigenen
 * Lernstoff: Fragen, Verkehrszeichen, Kurz erklärt und Faustformeln.
 */

export type KiNachricht = { id: string; rolle: "ich" | "ki"; text: string; quelle?: "ki" | "lernstoff" };
export type KiKontext = { frage: Frage; auswahl?: number[]; eingabe?: string };
export type KiAntwort = { text: string; quelle: "ki" | "lernstoff" };

export const NICHT_VERSTANDEN = "Ich verstehe diese Frage nicht";
export const NACHFRAGEN = ["Erklärung in leichter Sprache", "Gib mir ein Beispiel", "Hast du einen Merksatz?"] as const;

// ---------------------------------------------------------------------------
// Bausteine für die Erklärungen
// ---------------------------------------------------------------------------

const MERKSATZ: Record<ThemaId, string> = {
  gefahren: "Rechne immer mit Fehlern der anderen – dann bleibt dir Zeit zu reagieren.",
  vorfahrt: "Polizei vor Ampel, Ampel vor Schildern, Schilder vor „rechts vor links“.",
  zeichen: "Dreieck warnt, Kreis verbietet oder gebietet, Rechteck informiert.",
  umwelt: "Früh hochschalten, vorausschauend rollen lassen, bei längerem Halt den Motor aus.",
  technik: "Rote Leuchte: sofort sicher anhalten. Gelbe Leuchte: bald in die Werkstatt.",
  manoever: "Spiegel, Blinker, Schulterblick – erst dann losfahren, abbiegen oder überholen.",
  tempo: "Innerorts 50, außerorts 100, auf der Autobahn empfohlen 130 – und nie schneller, als du sehen kannst.",
  parken: "Wer länger als drei Minuten hält oder aussteigt und weggeht, der parkt.",
  autobahn: "Rettungsgasse: Wer ganz links fährt, weicht nach links aus – alle anderen nach rechts.",
  mensch: "In der Probezeit und unter 21 gilt: 0,0 Promille.",
  zahlen: "Reaktionsweg (v ÷ 10) × 3, Bremsweg (v ÷ 10)², beides zusammen ist der Anhalteweg.",
};

const BEISPIEL: Record<ThemaId, string> = {
  gefahren:
    "Zwischen zwei parkenden Autos rollt ein Ball auf die Straße. Rechne damit, dass gleich ein Kind hinterherläuft – Fuß vom Gas und bremsbereit sein.",
  vorfahrt:
    "Du fährst durch ein Wohngebiet und kommst an eine Kreuzung ohne Schilder und Ampel. Von rechts kommt ein Auto – es darf zuerst fahren, auch wenn du nur geradeaus willst.",
  zeichen:
    "Vor dir steht ein rotes Achteck mit „STOP“. Du hältst an der Haltlinie komplett an, auch wenn die Straße frei ist – erst danach fährst du weiter.",
  umwelt:
    "Vor einer roten Ampel nimmst du früh den Fuß vom Gas und lässt das Auto rollen, statt bis zuletzt zu beschleunigen und dann hart zu bremsen. Das spart Sprit und schont die Bremsen.",
  technik:
    "Während der Fahrt leuchtet die rote Öldruck-Leuchte. Du hältst so bald wie möglich sicher an und stellst den Motor ab – sonst kann er Schaden nehmen.",
  manoever:
    "Du willst rechts abbiegen, daneben verläuft ein Radweg. Bevor du lenkst, blickst du über die rechte Schulter – dort kann ein Radfahrer im toten Winkel sein.",
  tempo:
    "Auf der Landstraße fährst du 100 km/h. Nach dem halben Tacho brauchst du mindestens 50 m Abstand – das ist die Strecke von einem Leitpfosten zum nächsten.",
  parken: "Du lässt kurz jemanden aussteigen und fährst gleich weiter – das ist Halten. Steigst du selbst aus und gehst weg, parkst du.",
  autobahn:
    "Auf der Autobahn bildet sich ein Stau. Du fährst ganz links und weichst sofort nach links aus, alle anderen nach rechts – so entsteht die Rettungsgasse.",
  mensch: "Du bist in der Probezeit und warst auf einer Feier. Auch ein einziges Bier ist tabu, bevor du fährst.",
  zahlen: "Bei 50 km/h: Reaktionsweg (50 ÷ 10) × 3 = 15 m, Bremsweg (50 ÷ 10)² = 25 m – zusammen 40 m Anhalteweg.",
};

/** Was auf dem Bild der Frage zu sehen ist (für Erklärung und Server). */
export function bildBeschreibung(frage: Frage): string | null {
  const b = frage.bild;
  if (!b) return null;
  if (b.startsWith("leuchte_")) return `die Kontrollleuchte „${LEUCHTE_NAME[b as LeuchteKey]}“`;
  if (b.startsWith("lage_")) return "ein Lageplan – das blaue Auto bist du, andere Verkehrsteilnehmer sind orange";
  const z = ZEICHEN_INFO.find((x) => x.key === b);
  const nummer = b.slice(1).split("_")[0];
  return z ? `das Verkehrszeichen „${z.name}“ (Zeichen ${nummer})` : `ein Verkehrszeichen (Zeichen ${nummer})`;
}

function mitPunkt(s: string): string {
  return /[.!?…“]$/.test(s) ? s : `${s}.`;
}

function richtigeText(frage: Frage): string[] {
  if (frage.art === "zahl") return [`${zahlText(frage.loesung)} ${frage.einheit}`];
  return frage.antworten.filter((a) => a.richtig).map((a) => a.text);
}

/** Was hat die Person geantwortet? Als Text für Erklärung und Server. */
export function gewaehltText(k: KiKontext): string | null {
  const f = k.frage;
  if (f.art === "zahl") return k.eingabe?.trim() ? `${k.eingabe.trim()} ${f.einheit}` : null;
  const gewaehlt = (k.auswahl ?? []).map((i) => f.antworten[i]?.text).filter(Boolean);
  return gewaehlt.length ? gewaehlt.map((t) => `„${t}“`).join(", ") : null;
}

/** „Ich verstehe diese Frage nicht“ – aus den Daten der Frage erklärt. */
function lokalErklaeren(k: KiKontext): string {
  const f = k.frage;
  const thema = themaVon(f.thema);
  const teile: string[] = [];

  const bild = bildBeschreibung(f);
  teile.push(
    `**Worum geht's?**\nDie Frage gehört zum Thema „${thema.titel}“ (${thema.kurz}).` +
      (bild ? ` Auf dem Bild siehst du ${bild}.` : "") +
      (f.art === "zahl" ? " Gefragt ist eine Zahl – rechne in Ruhe Schritt für Schritt." : f.antworten.filter((a) => a.richtig).length > 1 ? " Achtung: Hier sind mehrere Antworten richtig – prüf jede für sich." : ""),
  );

  const richtige = richtigeText(f);
  teile.push(`**Richtig ist**\n${richtige.map((r) => `• ${mitPunkt(r)}`).join("\n")}`);
  teile.push(`**Warum?**\n${f.erklaerung}`);

  if (f.art === "auswahl" && k.auswahl?.length) {
    const falsch = k.auswahl.filter((i) => f.antworten[i] && !f.antworten[i].richtig).map((i) => f.antworten[i].text);
    const vergessen = f.antworten.filter((a, i) => a.richtig && !k.auswahl?.includes(i)).map((a) => a.text);
    if (falsch.length) teile.push(`Du hattest ${falsch.map((t) => `„${t}“`).join(" und ")} gewählt – das stimmt hier nicht.`);
    else if (vergessen.length) teile.push(`Fast! Es fehlte noch: ${vergessen.map((t) => `„${t}“`).join(" und ")}.`);
    else teile.push("Deine Antwort war richtig – stark!");
  }

  teile.push(`**Merksatz**\n${MERKSATZ[f.thema]}`);
  return teile.join("\n\n");
}

// ---------------------------------------------------------------------------
// Freie Fragen: Suche im Lernstoff der App
// ---------------------------------------------------------------------------

function normal(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const STOPPWOERTER = new Set(
  (
    "der die das den dem des ein eine einer eines einem einen und oder aber ich du er sie es wir ihr mir mich dir dich sich uns euch " +
    "ist sind bin bist war hat habe hast haben wird werden kann kannst darf darfst muss musst soll sollte wie was wo wann warum wieso " +
    "weshalb wer wen wem welche welcher welches mit von vom zu zum zur im in an am auf aus bei fuer ueber unter nicht kein keine auch nur " +
    "noch schon mal man bitte so wenn dann als ob da hier dort ja nein gibt geht eigentlich genau sagen erklaer erklaere erklaeren beim " +
    "frage fragen denn doch mehr viel sehr immer einfach bedeutet heisst meint gilt diese dieser dieses richtig richtige falsch " +
    "mache machen macht tun tue"
  ).split(" "),
);

/** Alltagswörter → Wörter aus dem Lernstoff („Landstraße“ heißt dort „außerorts“). */
const SYNONYME: Record<string, string[]> = {
  landstrasse: ["ausserorts"],
  stadt: ["innerorts"],
  ortschaft: ["innerorts"],
  dorf: ["innerorts"],
  schnell: ["geschwindigkeit", "tempo"],
  tempolimit: ["hoechstgeschwindigkeit"],
  smartphone: ["handy"],
  telefon: ["handy"],
  telefonieren: ["handy"],
  alkohol: ["promille"],
  bier: ["alkohol", "promille"],
  betrunken: ["alkohol", "promille"],
  trinken: ["alkohol"],
  einparken: ["parken"],
  parkplatz: ["parken"],
  parkluecke: ["parken"],
  muede: ["muedigkeit"],
  zebrastreifen: ["fussgaengerueberweg"],
  regen: ["naesse"],
  glatteis: ["glaette"],
  schnee: ["winterreifen", "glaette"],
  blinken: ["blinker"],
  licht: ["leuchte", "fernlicht"],
};

/** Grober Wortstamm, damit „fahren“, „Fahrt“ und „fährst“ zusammenfinden. */
function stamm(w: string): string {
  if (w.length < 5) return w;
  const endung = ["ungen", "ung", "ern", "est", "en", "er", "es", "em", "st", "e", "n", "s", "t"].find((e) => w.endsWith(e) && w.length - e.length >= 4);
  return endung ? w.slice(0, -endung.length) : w;
}

function roheWoerter(s: string): string[] {
  return normal(s)
    .split(" ")
    .filter((w) => w.length > 2 && !STOPPWOERTER.has(w));
}

function woerter(s: string): string[] {
  return roheWoerter(s).map(stamm);
}

type Eintrag = { woerter: string[]; antwort: string };

let eintraege: Eintrag[] | null = null;

/** Alles, was die App weiß – einmal aufbereitet. */
function lernstoff(): Eintrag[] {
  if (eintraege) return eintraege;
  const liste: Eintrag[] = [];
  for (const f of FRAGEN) {
    const richtige = richtigeText(f);
    liste.push({
      woerter: woerter(`${f.text} ${richtige.join(" ")} ${f.erklaerung}`),
      antwort: `${f.erklaerung}${f.art === "zahl" ? "" : `\n\n„${f.text}“ – richtig ist: ${richtige.map((r) => `„${r}“`).join(", ")}.`}`,
    });
  }
  for (const z of ZEICHEN_INFO) {
    const nummer = z.key.slice(1).split("_")[0];
    liste.push({
      woerter: woerter(`${z.name} ${z.kurz ?? ""} zeichen schild ${nummer} ${z.bedeutung}`),
      antwort: `**${z.name}** (Zeichen ${nummer})\n${z.bedeutung}\n\nWo du es siehst: ${z.fundort}`,
    });
  }
  for (const c of CLIPS) {
    liste.push({ woerter: woerter(`${c.titel} ${c.punkte.join(" ")}`), antwort: `**${c.titel}**\n${c.punkte.map((p) => `• ${p}`).join("\n")}` });
  }
  liste.push(
    { woerter: woerter("Reaktionsweg Reaktion Formel berechnen Sekunde"), antwort: "**Reaktionsweg** = (Geschwindigkeit ÷ 10) × 3\nBei 50 km/h also 5 × 3 = 15 m. Das ist die Strecke, die du fährst, bevor du überhaupt bremst." },
    { woerter: woerter("Bremsweg Formel berechnen bremsen normal"), antwort: "**Bremsweg** = (Geschwindigkeit ÷ 10)²\nBei 50 km/h also 5 × 5 = 25 m. Doppeltes Tempo heißt vierfacher Bremsweg." },
    { woerter: woerter("Gefahrenbremsung Vollbremsung Bremsweg Formel"), antwort: "**Bremsweg bei einer Gefahrenbremsung** = (Geschwindigkeit ÷ 10)² ÷ 2\nBei 50 km/h also 25 ÷ 2 = 12,5 m." },
    { woerter: woerter("Anhalteweg Formel berechnen anhalten Stillstand"), antwort: "**Anhalteweg** = Reaktionsweg + Bremsweg\nBei 50 km/h: 15 m + 25 m = 40 m." },
    { woerter: woerter("Sicherheitsabstand Abstand halber Tacho Formel Vordermann"), antwort: "**Sicherheitsabstand außerorts:** halber Tacho in Metern – bei 100 km/h also mindestens 50 m. Innerorts reichen in der Regel drei Fahrzeuglängen." },
  );
  eintraege = liste;
  return liste;
}

function treffer(q: string, d: string): number {
  if (q === d) return 1;
  const kurz = Math.min(q.length, d.length);
  if (kurz >= 5 && (d.startsWith(q) || q.startsWith(d))) return 0.8;
  if (q.length >= 5 && d.includes(q)) return 0.6;
  return 0;
}

/** Wie gut passt ein Suchwort (samt Synonymen) zu einem Eintrag? */
function passt(varianten: string[], eintrag: Eintrag): number {
  let best = 0;
  for (const v of varianten) for (const d of eintrag.woerter) best = Math.max(best, treffer(v, d));
  return best;
}

type Fund = { eintrag: Eintrag; wert: number; abgedeckt: number };

/**
 * Die besten Einträge zur Frage – gewichtet nach seltenen Wörtern. `abgedeckt`
 * ist der Anteil der Suchwörter, die im Eintrag vorkommen: Passt nur ein Wort
 * („Wie wird das Wetter morgen?“), ist es meist ein anderes Thema.
 */
function suchen(frage: string): Fund[] {
  const q = [...new Set(roheWoerter(frage))].map((w) => [w, ...(SYNONYME[w] ?? [])].map(stamm));
  if (!q.length) return [];
  const liste = lernstoff();
  const gewicht = q.map((varianten) => {
    const df = liste.filter((e) => passt(varianten, e) > 0).length;
    return Math.log(1 + liste.length / (1 + df));
  });
  return liste
    .map((eintrag) => {
      const besten = q.map((varianten) => passt(varianten, eintrag));
      return {
        eintrag,
        wert: besten.reduce((summe, b, i) => summe + gewicht[i] * b, 0),
        abgedeckt: besten.filter((b) => b > 0).length / q.length,
      };
    })
    .filter((t) => t.wert > 0)
    .sort((a, b) => b.wert - a.wert);
}

/** „Wie lang ist der Bremsweg bei 80?“ – mit den Faustformeln ausgerechnet. */
function rechnen(frage: string): string | null {
  const n = normal(frage);
  if (!/(brems|anhalte|reaktion|abstand|tacho)/.test(n)) return null;
  const zahl = n.match(/\b(\d{1,3})\b/);
  if (!zahl) return null;
  const v = Number(zahl[1]);
  if (v < 5 || v > 250) return null;
  const reaktion = (v / 10) * 3;
  const brems = (v / 10) ** 2;
  const z = (x: number) => zahlText(Math.round(x * 10) / 10);
  if (/abstand|tacho/.test(n)) return `Bei ${v}\u00a0km/h brauchst du außerorts mindestens **${z(v / 2)}\u00a0m** Abstand – das ist der halbe Tacho.`;
  const zeilen = [`Bei **${v}\u00a0km/h**:`, `• Reaktionsweg: (${v} ÷ 10) × 3 = ${z(reaktion)}\u00a0m`, `• Bremsweg: (${v} ÷ 10)² = ${z(brems)}\u00a0m`];
  if (/gefahr|voll/.test(n)) zeilen.push(`• Bremsweg bei Gefahrenbremsung: ${z(brems)} ÷ 2 = ${z(brems / 2)}\u00a0m`);
  zeilen.push(`• Anhalteweg: ${z(reaktion)} + ${z(brems)} = **${z(reaktion + brems)}\u00a0m**`);
  return zeilen.join("\n");
}

/** Eine freie Frage ohne Server beantworten. */
function lokalAntworten(k: KiKontext, frage: string): string {
  const f = k.frage;
  const n = normal(frage);
  // Kurze Nachfragen beziehen sich auf die aktuelle Frage, lange sind eigene Fragen.
  const kurz = n.split(" ").length <= 5;

  if (n.includes(normal(NICHT_VERSTANDEN)) || /^(versteh|kapier)/.test(n)) return lokalErklaeren(k);
  if (n === normal(NACHFRAGEN[0]) || (kurz && /einfacher|leichter/.test(n))) {
    return `Ganz einfach gesagt: ${richtigeText(f).map(mitPunkt).join(" ")}\n\nWarum? ${f.erklaerung}`;
  }
  if (n === normal(NACHFRAGEN[1]) || (kurz && /beispiel/.test(n))) return BEISPIEL[f.thema];
  if (n === normal(NACHFRAGEN[2]) || (kurz && /merksatz|eselsbruecke/.test(n))) return `Merk dir: ${MERKSATZ[f.thema]}`;
  if (n.split(" ").length <= 3 && /^(hallo|hi|hey|moin|servus|gruess|guten (morgen|tag|abend))\b/.test(n)) return "Hey! Frag mich einfach – zu dieser Frage oder zu allem rund um den Führerschein.";
  if (n.split(" ").length <= 3 && /^(danke|dankeschoen|merci|thx|super)/.test(n)) return "Gern geschehen! Viel Erfolg beim Lernen.";

  const rechnung = rechnen(frage);
  if (rechnung) return rechnung;

  const liste = suchen(frage).filter((t) => t.wert >= 1.4 && t.abgedeckt >= 0.5);
  const [erster, zweiter] = liste;
  if (erster) {
    const passt = zweiter && zweiter.wert >= erster.wert * 0.9 && zweiter.abgedeckt >= erster.abgedeckt && zweiter.eintrag.antwort !== erster.eintrag.antwort;
    return `${erster.eintrag.antwort}${passt ? `\n\nAußerdem: ${zweiter.eintrag.antwort}` : ""}`;
  }
  // Rückfragen zur aktuellen Frage („wieso?“, „und warum nicht die zweite?“)
  if ((kurz || /diese frage|die frage|\bhier\b/.test(n)) && /warum|wieso|weshalb|wie kommt|versteh|richtig|falsch|antwort/.test(n)) return `Zu dieser Frage: ${f.erklaerung}\n\nRichtig ist: ${richtigeText(f).map((r) => `„${r}“`).join(", ")}.`;

  return "Dazu habe ich gerade keine Antwort. Ich kenne mich vor allem mit dem Führerschein-Lernstoff aus – frag mich zum Beispiel „Wie lang ist der Bremsweg bei 100?“ oder „Was bedeutet das Stoppschild?“.";
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

/** Nach „nicht eingerichtet“ eine Weile nur lokal antworten. */
let serverAusBis = 0;

type ServerErgebnis = { text: string } | "aus" | "limit" | "fehler";

async function vomServer(k: KiKontext, verlauf: KiNachricht[], art: "erklaeren" | "frage"): Promise<ServerErgebnis> {
  if (!serverVerbunden || Date.now() < serverAusBis) return "aus";
  const { data: sitzung } = await supabase.auth.getSession();
  if (!sitzung.session) return "aus";

  const f = k.frage;
  // Die Unterhaltung beginnt mit der ersten eigenen Nachricht (die Begrüßung bleibt lokal).
  const start = verlauf.findIndex((m) => m.rolle === "ich");
  const body = {
    art,
    frage: {
      thema: themaVon(f.thema).titel,
      text: f.text,
      bild: bildBeschreibung(f),
      antworten: f.art === "auswahl" ? f.antworten.map((a) => ({ text: a.text, richtig: a.richtig })) : null,
      loesung: f.art === "zahl" ? `${zahlText(f.loesung)} ${f.einheit}` : null,
      erklaerung: f.erklaerung,
      gewaehlt: gewaehltText(k),
    },
    verlauf: (start < 0 ? [] : verlauf.slice(start)).slice(-12).map((m) => ({ rolle: m.rolle === "ich" ? "user" : "assistant", text: m.text })),
  };

  try {
    const antwort = await Promise.race([
      supabase.functions.invoke<{ text?: string }>("ki-hilfe", { body }),
      new Promise<"zeit">((fertig) => setTimeout(() => fertig("zeit"), 45000)),
    ]);
    if (antwort === "zeit") return "fehler";
    const { data, error } = antwort;
    if (error) {
      const status = (error as { context?: { status?: number } }).context?.status;
      if (status === 429) return "limit";
      // Nicht bereitgestellt, nicht eingerichtet oder nicht angemeldet
      if (status === 404 || status === 401 || status === 503) {
        serverAusBis = Date.now() + 10 * 60 * 1000;
        return "aus";
      }
      return "fehler";
    }
    return data?.text ? { text: data.text } : "fehler";
  } catch {
    return "fehler";
  }
}

/**
 * Antwort auf die letzte eigene Nachricht im Verlauf. `art` „erklaeren“ steht
 * für „Ich verstehe diese Frage nicht“.
 */
export async function kiAntwort(k: KiKontext, verlauf: KiNachricht[], art: "erklaeren" | "frage"): Promise<KiAntwort> {
  const letzte = [...verlauf].reverse().find((m) => m.rolle === "ich")?.text ?? NICHT_VERSTANDEN;
  const server = await vomServer(k, verlauf, art);
  if (typeof server === "object") return { text: server.text, quelle: "ki" };

  const lokal = art === "erklaeren" ? lokalErklaeren(k) : lokalAntworten(k, letzte);
  if (server === "limit") return { text: `Für heute hast du die KI schon oft gefragt – morgen geht es weiter. Bis dahin helfe ich aus dem Lernstoff:\n\n${lokal}`, quelle: "lernstoff" };
  return { text: lokal, quelle: "lernstoff" };
}

const SPEICHER_BEWERTUNG = "spur-ki-bewertungen";

/** Daumen hoch oder runter für eine Antwort – vorerst nur auf dem Gerät gesammelt. */
export async function kiBewerten(frageId: string, gut: boolean, antwort: string): Promise<void> {
  try {
    const alt = JSON.parse((await AsyncStorage.getItem(SPEICHER_BEWERTUNG)) ?? "[]") as unknown[];
    const neu = [...alt, { frage: frageId, gut, antwort: antwort.slice(0, 300), zeit: new Date().toISOString() }].slice(-200);
    await AsyncStorage.setItem(SPEICHER_BEWERTUNG, JSON.stringify(neu));
  } catch {
    // Ohne Speicher geht nur die Bewertung verloren.
  }
}
