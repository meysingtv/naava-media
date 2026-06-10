"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";

export interface KiVorschlag {
  id: string;
  name: string;
  alt: number;
  neu: number;
}

export interface KiErgebnis {
  ok?: boolean;
  error?: string;
  updates?: KiVorschlag[];
  hinweise?: string[];
}

/**
 * Schritt 1: Freitext des Fahrlehrers per KI den Schülern zuordnen und einen
 * Vorschlag für den neuen Lernstatus zurückgeben (noch NICHT gespeichert).
 */
export async function lernfortschrittAuswerten(text: string): Promise<KiErgebnis> {
  const eingabe = (text ?? "").trim();
  if (!eingabe) return { error: "Bitte zuerst etwas eingeben." };

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return { error: "Kein ANTHROPIC_API_KEY gesetzt. Bitte in .env.local eintragen." };
  }

  const kontext = await getKontext();
  if (!kontext?.fahrschule) return { error: "Keine Fahrschule gefunden." };

  const supabase = createClient();
  const { data } = await supabase.from("fahrschueler").select("id, vorname, nachname, lernstatus");
  const schueler = (data ?? []) as {
    id: string;
    vorname: string;
    nachname: string;
    lernstatus: number | null;
  }[];
  if (schueler.length === 0) return { error: "Keine Schüler vorhanden." };

  const liste = schueler.map((s) => ({ id: s.id, name: `${s.vorname} ${s.nachname}` }));

  const system = `Du hilfst einer Fahrschule, den Theorie-Lernstatus (0–100 %) von Schülern zu aktualisieren.
Du bekommst (1) eine Liste der Schüler mit IDs und (2) einen frei formulierten Text des Fahrlehrers.
Ordne die Angaben den Schülern zu und gib AUSSCHLIESSLICH gültiges JSON in genau diesem Format zurück:
{"updates":[{"id":"<id aus der Liste>","lernstatus":<ganze Zahl 0-100>}],"hinweise":["..."]}
Regeln:
- Nimm nur Schüler auf, die du EINDEUTIG zuordnen kannst.
- Wenn keine konkrete Prozentzahl genannt ist (z. B. nur "fertig"), NICHT raten – schreib stattdessen einen Hinweis.
- Mehrdeutige oder nicht gefundene Namen NICHT raten – erkläre sie in "hinweise".
- Kein Text außerhalb des JSON.`;
  const userMsg = `Schüler:\n${JSON.stringify(liste)}\n\nText des Fahrlehrers:\n${eingabe}`;

  let raw = "";
  try {
    const anthropic = new Anthropic({ apiKey: key });
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: userMsg }],
    });
    raw = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  } catch (e) {
    return { error: `KI-Aufruf fehlgeschlagen: ${(e as Error).message}` };
  }

  const start = raw.indexOf("{");
  const ende = raw.lastIndexOf("}");
  if (start < 0 || ende < 0) return { error: "Die KI-Antwort konnte nicht gelesen werden." };

  let parsed: { updates?: { id?: string; lernstatus?: number }[]; hinweise?: string[] };
  try {
    parsed = JSON.parse(raw.slice(start, ende + 1));
  } catch {
    return { error: "Die KI-Antwort war kein gültiges JSON." };
  }

  const byId = new Map(schueler.map((s) => [s.id, s]));
  const updates: KiVorschlag[] = [];
  for (const u of parsed.updates ?? []) {
    const s = u.id ? byId.get(u.id) : undefined;
    const neu = Math.round(Number(u.lernstatus));
    if (!s || !Number.isFinite(neu)) continue;
    updates.push({
      id: s.id,
      name: `${s.vorname} ${s.nachname}`,
      alt: s.lernstatus ?? 0,
      neu: Math.min(100, Math.max(0, neu)),
    });
  }

  return { ok: true, updates, hinweise: parsed.hinweise ?? [] };
}

/** Schritt 2: Die vom Nutzer bestätigten Lernstatus-Werte speichern. */
export async function lernfortschrittSpeichern(
  updates: { id: string; neu: number }[],
): Promise<KiErgebnis> {
  if (!updates?.length) return { error: "Nichts zu speichern." };

  const kontext = await getKontext();
  if (!kontext?.fahrschule) return { error: "Keine Fahrschule gefunden." };

  const supabase = createClient();
  for (const u of updates) {
    const neu = Math.min(100, Math.max(0, Math.round(Number(u.neu))));
    if (!u.id || !Number.isFinite(neu)) continue;
    // RLS stellt sicher, dass nur eigene Schüler aktualisiert werden.
    await supabase.from("fahrschueler").update({ lernstatus: neu }).eq("id", u.id);
  }

  revalidatePath("/schueler");
  return { ok: true };
}
