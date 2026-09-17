import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import { pflichtFahrtenFuer } from "@/lib/constants";
import type { FahrstundeTyp } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5";

// ---------------------------------------------------------------------
// Hilfsfunktionen (Datum, Slots)
// ---------------------------------------------------------------------
function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function minToUhr(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
function uhrToMin(u: string): number {
  const [h, m] = u.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

type Belegung = { datum: string; uhrzeit: string; dauer_minuten: number | null; fahrlehrer_id: string | null; fahrzeug_id: string | null; schueler_id: string | null };
function frei(belegt: Belegung[], feld: keyof Belegung, id: string, datum: string, start: number, dauer: number): boolean {
  const ende = start + dauer;
  return !belegt.some((b) => {
    if (b.datum !== datum || b[feld] !== id) return false;
    const bs = uhrToMin(b.uhrzeit);
    return start < bs + (b.dauer_minuten ?? 45) && ende > bs;
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = any;

// ---------------------------------------------------------------------
// Werkzeuge (Tools) für den Assistenten
// ---------------------------------------------------------------------
const tools = [
  {
    name: "schueler_finden",
    description: "Findet Fahrschüler anhand eines Namens (oder Namensteils). Gibt id, Name und Klasse zurück – die id wird für andere Werkzeuge gebraucht.",
    input_schema: {
      type: "object",
      properties: { name: { type: "string", description: "Vor- oder Nachname (Teil reicht)" } },
      required: ["name"],
    },
  },
  {
    name: "pruefungsreife",
    description: "Listet Schüler, die alle Pflicht-Sonderfahrten (Überland/Autobahn/Nacht) abgeschlossen haben, also praktisch prüfungsreif sind – plus die, denen nur noch wenige fehlen.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "freie_slots",
    description: "Findet die nächsten freien Termin-Slots (Fahrlehrer + Fahrzeug frei), optional ab einem Datum oder für einen bestimmten Fahrlehrer. Gibt Datum, Uhrzeit und ids zurück.",
    input_schema: {
      type: "object",
      properties: {
        ab_datum: { type: "string", description: "ISO-Datum JJJJ-MM-TT, optional" },
        fahrlehrer_name: { type: "string", description: "Name des Fahrlehrers, optional" },
        anzahl: { type: "number", description: "Wie viele Vorschläge (max 6)" },
      },
    },
  },
  {
    name: "termin_anlegen",
    description: "Legt eine Fahrstunde an. Vorher die Details mit dem Nutzer bestätigen. Nutzt ids aus schueler_finden/freie_slots.",
    input_schema: {
      type: "object",
      properties: {
        schueler_id: { type: "string" },
        datum: { type: "string", description: "ISO JJJJ-MM-TT" },
        uhrzeit: { type: "string", description: "HH:MM" },
        typ: { type: "string", enum: ["normal", "ueberland", "autobahn", "nacht", "theorie", "sonstiges"] },
        dauer_minuten: { type: "number" },
        fahrlehrer_id: { type: "string" },
        fahrzeug_id: { type: "string" },
      },
      required: ["datum", "uhrzeit"],
    },
  },
  {
    name: "offene_rechnungen",
    description: "Fasst offene und überfällige Rechnungen zusammen (Schüler, Betrag, Fälligkeit, Summe).",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "auslastung",
    description: "Auslastung dieser Woche gesamt und je Fahrlehrer (gebuchte Stunden), plus Anzahl geplanter Fahrstunden.",
    input_schema: { type: "object", properties: {} },
  },
];

// ---------------------------------------------------------------------
// Werkzeug-Ausführung
// ---------------------------------------------------------------------
async function ausfuehren(
  name: string,
  input: Record<string, unknown>,
  supabase: SB,
  fahrschuleId: string,
): Promise<{ summary: string; data: unknown }> {
  const heute = new Date();

  if (name === "schueler_finden") {
    const q = String(input.name ?? "").trim();
    const { data } = await supabase
      .from("fahrschueler")
      .select("id, vorname, nachname, fuehrerscheinklassen")
      .or(`vorname.ilike.%${q}%,nachname.ilike.%${q}%`)
      .limit(10);
    const liste = (data ?? []).map((s: SB) => ({ id: s.id, name: `${s.vorname} ${s.nachname}`, klasse: s.fuehrerscheinklassen?.[0] ?? "B" }));
    return { summary: `${liste.length} Schüler gefunden`, data: liste };
  }

  if (name === "pruefungsreife") {
    const { data: studs } = await supabase
      .from("fahrschueler")
      .select("id, vorname, nachname, fuehrerscheinklassen")
      .eq("ausbildung_beendet", false);
    const { data: stunden } = await supabase.from("fahrstunde").select("schueler_id, typ").eq("status", "abgeschlossen");
    const zaehl: Record<string, { ueberland: number; autobahn: number; nacht: number }> = {};
    for (const s of (stunden ?? []) as { schueler_id: string | null; typ: string }[]) {
      if (!s.schueler_id) continue;
      const z = (zaehl[s.schueler_id] ??= { ueberland: 0, autobahn: 0, nacht: 0 });
      if (s.typ === "ueberland" || s.typ === "autobahn" || s.typ === "nacht") z[s.typ] += 1;
    }
    const reif: string[] = [];
    const fast: string[] = [];
    for (const st of studs ?? []) {
      const p = pflichtFahrtenFuer(st.fuehrerscheinklassen?.[0] ?? "B");
      const z = zaehl[st.id] ?? { ueberland: 0, autobahn: 0, nacht: 0 };
      const fehlt = Math.max(0, p.ueberland - z.ueberland) + Math.max(0, p.autobahn - z.autobahn) + Math.max(0, p.nacht - z.nacht);
      const name2 = `${st.vorname} ${st.nachname}`;
      if (fehlt === 0) reif.push(name2);
      else if (fehlt <= 2) fast.push(`${name2} (noch ${fehlt})`);
    }
    return { summary: `${reif.length} prüfungsreif, ${fast.length} fast`, data: { pruefungsreif: reif, fast_reif: fast } };
  }

  if (name === "freie_slots") {
    const anzahl = Math.min(6, Number(input.anzahl ?? 4) || 4);
    const abDatum = typeof input.ab_datum === "string" && input.ab_datum ? new Date(input.ab_datum) : heute;
    const bis = new Date(abDatum);
    bis.setDate(bis.getDate() + 21);
    const [{ data: lehrer }, { data: fahrzeuge }, { data: belegtD }] = await Promise.all([
      supabase.from("fahrlehrer").select("id, vorname, nachname").eq("aktiv", true).order("nachname"),
      supabase.from("fahrzeug").select("id, kennzeichen").eq("aktiv", true).order("kennzeichen"),
      supabase
        .from("fahrstunde")
        .select("datum, uhrzeit, dauer_minuten, fahrlehrer_id, fahrzeug_id, schueler_id")
        .gte("datum", iso(abDatum))
        .lte("datum", iso(bis))
        .neq("status", "ausgefallen"),
    ]);
    let lehrerListe = (lehrer ?? []) as SB[];
    const nameFilter = String(input.fahrlehrer_name ?? "").trim().toLowerCase();
    if (nameFilter) lehrerListe = lehrerListe.filter((l) => `${l.vorname} ${l.nachname}`.toLowerCase().includes(nameFilter));
    const belegt = (belegtD ?? []) as Belegung[];
    const fz = (fahrzeuge ?? []) as SB[];
    const slots: unknown[] = [];
    for (let tag = 0; tag <= 21 && slots.length < anzahl; tag++) {
      const d = new Date(abDatum);
      d.setDate(d.getDate() + tag);
      if (d.getDay() === 0 || d < heute) continue;
      const datum = iso(d);
      for (let start = 8 * 60; start + 45 <= 18 * 60 && slots.length < anzahl; start += 45) {
        const l = lehrerListe.find((x) => frei(belegt, "fahrlehrer_id", x.id, datum, start, 45));
        if (lehrerListe.length && !l) continue;
        const f = fz.find((x) => frei(belegt, "fahrzeug_id", x.id, datum, start, 45));
        if (fz.length && !f) continue;
        slots.push({
          datum,
          uhrzeit: minToUhr(start),
          fahrlehrer_id: l?.id ?? null,
          fahrlehrer: l ? `${l.vorname} ${l.nachname}` : null,
          fahrzeug_id: f?.id ?? null,
          fahrzeug: f?.kennzeichen ?? null,
        });
      }
    }
    return { summary: `${slots.length} freie Slots`, data: slots };
  }

  if (name === "termin_anlegen") {
    const datum = String(input.datum ?? "");
    const uhrzeit = String(input.uhrzeit ?? "");
    if (!datum || !uhrzeit) return { summary: "Fehler", data: { error: "Datum und Uhrzeit nötig" } };
    const { error } = await supabase.from("fahrstunde").insert({
      fahrschule_id: fahrschuleId,
      schueler_id: (input.schueler_id as string) || null,
      fahrlehrer_id: (input.fahrlehrer_id as string) || null,
      fahrzeug_id: (input.fahrzeug_id as string) || null,
      datum,
      uhrzeit,
      dauer_minuten: Number(input.dauer_minuten ?? 45) || 45,
      typ: (String(input.typ ?? "normal") as FahrstundeTyp) || "normal",
      status: "geplant",
    });
    if (error) return { summary: "Fehler", data: { error: error.message } };
    return { summary: `Termin ${datum} ${uhrzeit} angelegt`, data: { ok: true } };
  }

  if (name === "offene_rechnungen") {
    const { data } = await supabase
      .from("rechnung")
      .select("nummer, betrag_brutto, faelligkeitsdatum, status, fahrschueler(vorname, nachname)")
      .in("status", ["offen", "ueberfaellig"])
      .order("faelligkeitsdatum", { ascending: true })
      .limit(50);
    const heuteIso = iso(heute);
    const liste = (data ?? []).map((r: SB) => ({
      nummer: r.nummer,
      schueler: r.fahrschueler ? `${r.fahrschueler.vorname} ${r.fahrschueler.nachname}` : "—",
      betrag: Number(r.betrag_brutto ?? 0),
      faellig: r.faelligkeitsdatum,
      ueberfaellig: r.faelligkeitsdatum ? r.faelligkeitsdatum < heuteIso : false,
    }));
    const summe = liste.reduce((s: number, r: SB) => s + r.betrag, 0);
    return { summary: `${liste.length} offen, Summe ${summe.toFixed(2)} €`, data: { rechnungen: liste, summe } };
  }

  if (name === "auslastung") {
    const wStart = new Date(heute);
    wStart.setDate(wStart.getDate() - ((wStart.getDay() + 6) % 7));
    const wEnde = new Date(wStart);
    wEnde.setDate(wEnde.getDate() + 6);
    const [{ data: lehrer }, { data: stunden }] = await Promise.all([
      supabase.from("fahrlehrer").select("id, vorname, nachname").eq("aktiv", true),
      supabase
        .from("fahrstunde")
        .select("dauer_minuten, fahrlehrer_id, status")
        .gte("datum", iso(wStart))
        .lte("datum", iso(wEnde))
        .neq("status", "ausgefallen"),
    ]);
    const jeLehrer: Record<string, number> = {};
    let gesamt = 0;
    for (const s of stunden ?? []) {
      const h = (s.dauer_minuten ?? 45) / 60;
      gesamt += h;
      if (s.fahrlehrer_id) jeLehrer[s.fahrlehrer_id] = (jeLehrer[s.fahrlehrer_id] ?? 0) + h;
    }
    const kapazitaet = Math.max(1, (lehrer ?? []).length * 40);
    const proLehrer = (lehrer ?? []).map((l: SB) => ({ name: `${l.vorname} ${l.nachname}`, stunden: Math.round((jeLehrer[l.id] ?? 0) * 10) / 10 }));
    return {
      summary: `Auslastung ${Math.round((gesamt / kapazitaet) * 100)} %`,
      data: { auslastung_prozent: Math.round((gesamt / kapazitaet) * 100), gebucht_stunden: Math.round(gesamt), kapazitaet_stunden: kapazitaet, anzahl_fahrstunden: (stunden ?? []).length, je_fahrlehrer: proLehrer },
    };
  }

  return { summary: "Unbekanntes Werkzeug", data: { error: "unknown tool" } };
}

// ---------------------------------------------------------------------
// POST-Handler: Assistent mit Werkzeug-Schleife
// ---------------------------------------------------------------------
export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({
      text: "Der KI-Assistent ist noch nicht aktiviert. Bitte die Umgebungsvariable ANTHROPIC_API_KEY setzen (und ggf. ANTHROPIC_MODEL).",
      actions: [],
    });
  }

  const kontext = await getKontext();
  if (!kontext?.fahrschule) {
    return NextResponse.json({ text: "Nicht angemeldet.", actions: [] }, { status: 401 });
  }

  let body: { messages?: { role: "user" | "assistant"; content: string }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ text: "Ungültige Anfrage.", actions: [] }, { status: 400 });
  }
  const verlauf = (body.messages ?? []).filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string");
  if (verlauf.length === 0) return NextResponse.json({ text: "Keine Nachricht.", actions: [] }, { status: 400 });

  const supabase = createClient();
  const heute = new Date();
  const rolle = kontext.fahrlehrer?.rolle ?? "chef";

  const system =
    `Du bist der Assistent der Fahrschule „${kontext.fahrschule.name}". Heute ist ${heute.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}. ` +
    `Die anfragende Person hat die Rolle „${rolle}". ` +
    `Antworte kurz, freundlich und auf Deutsch. Nutze die Werkzeuge, um echte Daten der Fahrschule zu lesen oder Termine anzulegen – erfinde niemals Zahlen, Namen oder Termine. ` +
    `Bevor du mit „termin_anlegen" etwas anlegst, fasse den geplanten Termin zusammen und lass ihn bestätigen, außer der Nutzer hat schon klar zugestimmt. ` +
    `Wenn dir Angaben fehlen (z. B. welcher Schüler), frag kurz nach oder nutze „schueler_finden". Formatiere Listen knapp mit Bindestrichen.`;

  const anthropic = new Anthropic();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: any[] = verlauf.map((m) => ({ role: m.role, content: m.content }));
  const actions: { tool: string; summary: string }[] = [];

  try {
    for (let runde = 0; runde < 6; runde++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 4000,
        system,
        tools,
        messages,
      } as Anthropic.MessageCreateParamsNonStreaming);

      messages.push({ role: "assistant", content: res.content });

      if (res.stop_reason !== "tool_use") {
        const text = (res.content as SB[])
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim();
        return NextResponse.json({ text: text || "…", actions });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toolResults: any[] = [];
      for (const block of res.content as SB[]) {
        if (block.type !== "tool_use") continue;
        const out = await ausfuehren(block.name, block.input ?? {}, supabase, kontext.fahrschule.id);
        actions.push({ tool: block.name, summary: out.summary });
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(out.data) });
      }
      messages.push({ role: "user", content: toolResults });
    }
    return NextResponse.json({ text: "Das war etwas viel auf einmal – frag mich bitte Schritt für Schritt.", actions });
  } catch (err) {
    const msg = err instanceof Anthropic.APIError ? `KI-Dienst-Fehler (${err.status}).` : "Der Assistent ist gerade nicht erreichbar.";
    return NextResponse.json({ text: msg, actions }, { status: 200 });
  }
}
