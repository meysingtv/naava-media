"use server";

import Anthropic from "@anthropic-ai/sdk";

import { createClient } from "@/lib/supabase/server";
import { ROLLEN } from "@/lib/constants";
import type { FahrlehrerRolle } from "@/lib/types";

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------

export interface SuchTreffer {
  typ: "schueler" | "benutzer" | "fahrzeug" | "rechnung";
  id: string;
  titel: string;
  untertitel?: string;
  href: string;
}

export interface SuchErgebnis {
  treffer: SuchTreffer[];
  kiAntwort?: string;
}

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

/**
 * Bereinigt die Suchanfrage, um PostgREST-`or`-Filter-Injection zu vermeiden.
 * Erlaubt-Liste: Buchstaben (inkl. Umlaute/Unicode), Ziffern, Leerzeichen und
 * Bindestrich. Alle Sonderzeichen (% , . : ( ) " usw.) werden entfernt.
 */
function bereinigeQuery(q: string): string {
  // Erlaubt: a–z, A–Z, 0–9, deutsche Umlaute/ß, Leerzeichen, Bindestrich.
  // Entfernt alle PostgREST-Sonderzeichen (% , . : ( ) " usw.).
  return q.replace(/[^a-zA-Z0-9äöüÄÖÜß\s-]/g, "").trim();
}

// ---------------------------------------------------------------------------
// Globale Suche
// ---------------------------------------------------------------------------

/**
 * Durchsucht Schüler, Benutzer, Fahrzeuge und Rechnungen parallel.
 * Gibt maximal ~16 Treffer zurück (je 5 pro Kategorie, zusammengefasst).
 */
export async function globalSuche(query: string): Promise<SuchTreffer[]> {
  const roh = (query ?? "").trim();
  if (roh.length < 2) return [];

  const q = bereinigeQuery(roh);
  if (q.length < 2) return [];

  const supabase = createClient();
  const muster = `%${q}%`;

  // Alle vier Abfragen gleichzeitig starten
  const [schuelerRes, fahrlehrerRes, fahrzeugRes, rechnungRes] = await Promise.all([
    // Schüler: Vorname, Nachname und optional Kundennummer (wenn numerisch)
    supabase
      .from("fahrschueler")
      .select("id, vorname, nachname, ort, fuehrerscheinklassen, kundennummer")
      .or(`vorname.ilike.${muster},nachname.ilike.${muster}`)
      .limit(5),

    // Fahrlehrer/Benutzer: Vorname, Nachname, Kürzel
    supabase
      .from("fahrlehrer")
      .select("id, vorname, nachname, kuerzel, rolle")
      .or(`vorname.ilike.${muster},nachname.ilike.${muster},kuerzel.ilike.${muster}`)
      .limit(5),

    // Fahrzeuge: Kennzeichen, Name, Marke, Modell
    supabase
      .from("fahrzeug")
      .select("id, kennzeichen, name, marke, modell")
      .or(`kennzeichen.ilike.${muster},name.ilike.${muster},marke.ilike.${muster},modell.ilike.${muster}`)
      .limit(5),

    // Rechnungen: Nummer
    supabase
      .from("rechnung")
      .select("id, nummer, status")
      .ilike("nummer", muster)
      .limit(5),
  ]);

  const treffer: SuchTreffer[] = [];

  // Schüler-Treffer aufbauen
  for (const s of schuelerRes.data ?? []) {
    const klassen = Array.isArray(s.fuehrerscheinklassen) && s.fuehrerscheinklassen.length > 0
      ? (s.fuehrerscheinklassen as string[]).join(", ")
      : undefined;
    const untertitel = s.ort ?? klassen;
    treffer.push({
      typ: "schueler",
      id: String(s.id),
      titel: `${s.vorname} ${s.nachname}`,
      untertitel,
      href: `/schueler?id=${s.id}`,
    });
  }

  // Kundennummer-Suche nur wenn query rein numerisch ist
  if (/^\d+$/.test(q)) {
    const kundenNr = parseInt(q, 10);
    const { data: knData } = await supabase
      .from("fahrschueler")
      .select("id, vorname, nachname, ort, fuehrerscheinklassen, kundennummer")
      .eq("kundennummer", kundenNr)
      .limit(3);

    for (const s of knData ?? []) {
      // Doppelungen vermeiden
      if (treffer.some((t) => t.id === String(s.id))) continue;
      const klassen = Array.isArray(s.fuehrerscheinklassen) && s.fuehrerscheinklassen.length > 0
        ? (s.fuehrerscheinklassen as string[]).join(", ")
        : undefined;
      treffer.push({
        typ: "schueler",
        id: String(s.id),
        titel: `${s.vorname} ${s.nachname}`,
        untertitel: s.ort ?? klassen,
        href: `/schueler?id=${s.id}`,
      });
    }
  }

  // Benutzer/Fahrlehrer-Treffer aufbauen
  for (const l of fahrlehrerRes.data ?? []) {
    treffer.push({
      typ: "benutzer",
      id: String(l.id),
      titel: `${l.vorname} ${l.nachname}`,
      untertitel: ROLLEN[l.rolle as FahrlehrerRolle] ?? l.rolle,
      href: `/fahrlehrer?id=${l.id}`,
    });
  }

  // Fahrzeug-Treffer aufbauen
  for (const f of fahrzeugRes.data ?? []) {
    treffer.push({
      typ: "fahrzeug",
      id: String(f.id),
      titel: (f.name ?? f.kennzeichen) as string,
      untertitel: f.kennzeichen as string,
      href: `/fahrzeuge?id=${f.id}`,
    });
  }

  // Rechnungs-Treffer aufbauen
  for (const r of rechnungRes.data ?? []) {
    treffer.push({
      typ: "rechnung",
      id: String(r.id),
      titel: `Rechnung ${r.nummer}`,
      href: `/rechnungen/${r.id}`,
    });
  }

  // Maximal ~16 Treffer zurückgeben
  return treffer.slice(0, 16);
}

// ---------------------------------------------------------------------------
// KI-Suche (mit Claude Haiku, graceful degradation wenn kein API-Key)
// ---------------------------------------------------------------------------

/**
 * Führt zuerst globalSuche durch, fragt dann Claude nach einer
 * zusammenfassenden deutschen Antwort (optional, wenn API-Key vorhanden).
 */
export async function kiSuche(query: string): Promise<SuchErgebnis> {
  // Zuerst normale Suche durchführen
  const treffer = await globalSuche(query);

  // Kein API-Key oder keine Treffer → ohne KI-Antwort zurückgeben
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || treffer.length === 0) {
    return { treffer };
  }

  // Kompakte Liste für das KI-Prompt (Tokens sparen)
  const kompakt = treffer.map((t) => ({
    typ: t.typ,
    titel: t.titel,
    untertitel: t.untertitel,
  }));

  const system =
    "Du bist ein Assistent für eine Fahrschule. " +
    "Beantworte kurz und präzise auf Deutsch (max. 200 Zeichen), " +
    "welches Ergebnis am besten zur Suchanfrage passt. " +
    "Kein Markdown, keine Listen – nur ein einziger Satz.";

  const userMsg =
    `Suchanfrage: "${query}"\n` +
    `Gefundene Einträge:\n${JSON.stringify(kompakt, null, 0)}`;

  try {
    const anthropic = new Anthropic({ apiKey: key });
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 150,
      system,
      messages: [{ role: "user", content: userMsg }],
    });
    const kiAntwort = msg.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim()
      .slice(0, 300); // Sicherheitshalber kürzen

    return { treffer, kiAntwort: kiAntwort || undefined };
  } catch {
    // KI-Fehler nie an den Nutzer weitergeben – einfach ohne kiAntwort zurückgeben
    return { treffer };
  }
}
