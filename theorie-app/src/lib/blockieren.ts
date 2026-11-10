import { useSyncExternalStore } from "react";

import { serverVerbunden, supabase } from "./supabase";

/**
 * Andere Nutzer blockieren (SQL Abschnitt 27): Von blockierten Personen zeigt
 * die App keine Clips, Kommentare und Chat-Nachrichten mehr. Die Liste der
 * eigenen Blockierungen wird beim Anmelden einmal geladen und hier gehalten.
 */

export type BlockierterNutzer = {
  id: string;
  name: string;
  benutzername: string;
  avatar_farbe: string;
  bild_pfad: string | null;
  erstellt_am: string;
};

let ids: ReadonlySet<string> = new Set();
let geladenFuer: string | null = null;
const hoerer = new Set<() => void>();

function setzen(neu: ReadonlySet<string>) {
  ids = neu;
  hoerer.forEach((h) => h());
}

function abonnieren(h: () => void) {
  hoerer.add(h);
  return () => {
    hoerer.delete(h);
  };
}

function meldung(e: unknown): string {
  const text = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : String(e);
  if (/lern_blockier|lern_entblocken|schema cache|does not exist/i.test(text)) return "Das SQL-Update fehlt noch (supabase/update-konto.sql).";
  if (/network|fetch|internet/i.test(text)) return "Keine Verbindung. Bitte prüfe dein Internet.";
  if (/nicht angemeldet|jwt/i.test(text)) return "Bitte melde dich an.";
  return text;
}

/** Beim An- und Abmelden aufrufen: lädt die eigenen Blockierungen (oder leert sie). */
export async function blockiertLaden(nutzer: string | null): Promise<void> {
  if (!nutzer || !serverVerbunden) {
    geladenFuer = null;
    if (ids.size) setzen(new Set());
    return;
  }
  geladenFuer = nutzer;
  try {
    const { data, error } = await supabase.from("lern_blockiert").select("wen").eq("von", nutzer);
    if (error) throw error;
    if (geladenFuer === nutzer) setzen(new Set((data ?? []).map((z: { wen: string }) => z.wen)));
  } catch {
    // Ohne Netz oder ohne SQL-Update: nichts ausblenden
  }
}

/** Ids der blockierten Personen – Komponenten zeichnen neu, sobald sich etwas ändert. */
export function useBlockiert(): ReadonlySet<string> {
  return useSyncExternalStore(abonnieren, () => ids);
}

export function istBlockiert(id: string | null | undefined): boolean {
  return Boolean(id && ids.has(id));
}

/** Person blockieren – `null` bei Erfolg, sonst eine verständliche Meldung. */
export async function blockieren(id: string): Promise<string | null> {
  const { error } = await supabase.rpc("lern_blockieren", { p_wen: id });
  if (error) return meldung(error);
  setzen(new Set([...ids, id]));
  return null;
}

export async function entblocken(id: string): Promise<string | null> {
  const { error } = await supabase.rpc("lern_entblocken", { p_wen: id });
  if (error) return meldung(error);
  const neu = new Set(ids);
  neu.delete(id);
  setzen(neu);
  return null;
}

/** Für die Einstellungen: wen ich blockiert habe, mit Name und Bild. */
export async function blockiertListe(): Promise<BlockierterNutzer[]> {
  const { data, error } = await supabase.rpc("lern_blockiert_liste");
  if (error) throw new Error(meldung(error));
  return (data ?? []) as BlockierterNutzer[];
}
