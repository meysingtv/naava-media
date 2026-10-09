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
  {
    name: "termine_am_tag",
    description: "Zeigt alle Termine eines Tages (Standard: heute) mit Uhrzeit, Schüler, Art, Status, Fahrlehrer und Fahrzeug – inkl. Termin-id (für Absagen).",
    input_schema: { type: "object", properties: { datum: { type: "string", description: "ISO JJJJ-MM-TT, optional" } } },
  },
  {
    name: "schueler_details",
    description: "Stand eines Schülers: Kontakt, Klasse, abgeschlossene Sonderfahrten, Theorie bestanden, nächster Termin und offene Rechnungssumme. Per Name oder id.",
    input_schema: { type: "object", properties: { name: { type: "string" }, schueler_id: { type: "string" } } },
  },
  {
    name: "pruefungen_anstehend",
    description: "Listet anstehende (offene) Prüfungen der nächsten Tage (Standard 14) mit Schüler, Art, Datum und Prüfstelle.",
    input_schema: { type: "object", properties: { tage: { type: "number" } } },
  },
  {
    name: "offene_aufgaben",
    description: "Listet offene Aufgaben (To-dos) mit Titel, Fälligkeit und Priorität.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "umsatz_statistik",
    description: "Kennzahlen des laufenden Monats: Umsatz, offene und überfällige Summe, neue Schüler, Anzahl Fahrstunden.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "schueler_anlegen",
    description: "Legt einen neuen Fahrschüler an. Vorher bestätigen lassen. Pflicht: Vor- und Nachname.",
    input_schema: {
      type: "object",
      properties: {
        vorname: { type: "string" },
        nachname: { type: "string" },
        telefon: { type: "string" },
        email: { type: "string" },
        klasse: { type: "string", description: "z. B. B, A, BE" },
      },
      required: ["vorname", "nachname"],
    },
  },
  {
    name: "aufgabe_anlegen",
    description: "Legt eine Aufgabe (To-do) an. Pflicht: Titel. Optional Fälligkeit (ISO) und Priorität.",
    input_schema: {
      type: "object",
      properties: {
        titel: { type: "string" },
        faellig_am: { type: "string", description: "ISO JJJJ-MM-TT" },
        prioritaet: { type: "string", enum: ["niedrig", "mittel", "hoch"] },
      },
      required: ["titel"],
    },
  },
  {
    name: "termin_absagen",
    description: "Sagt einen Termin ab (Status ausgefallen). Nutzt die id aus termine_am_tag. Vorher bestätigen lassen.",
    input_schema: { type: "object", properties: { fahrstunde_id: { type: "string" } }, required: ["fahrstunde_id"] },
  },
  {
    name: "zahlung_erfassen",
    description: "Erfasst eine Zahlung eines Schülers. Vorher bestätigen lassen.",
    input_schema: {
      type: "object",
      properties: {
        schueler_id: { type: "string" },
        rechnung_id: { type: "string" },
        betrag: { type: "number" },
        art: { type: "string", enum: ["bar", "ueberweisung", "lastschrift", "karte"] },
      },
      required: ["betrag"],
    },
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

  if (name === "termine_am_tag") {
    const datum = typeof input.datum === "string" && input.datum ? input.datum : iso(heute);
    const { data } = await supabase
      .from("fahrstunde")
      .select("id, uhrzeit, dauer_minuten, typ, status, fahrschueler(vorname, nachname), fahrlehrer(vorname, nachname), fahrzeug(kennzeichen)")
      .eq("datum", datum)
      .order("uhrzeit", { ascending: true });
    const liste = (data ?? []).map((t: SB) => ({
      id: t.id,
      uhrzeit: String(t.uhrzeit ?? "").slice(0, 5),
      dauer_minuten: t.dauer_minuten,
      typ: t.typ,
      status: t.status,
      schueler: t.fahrschueler ? `${t.fahrschueler.vorname} ${t.fahrschueler.nachname}` : null,
      fahrlehrer: t.fahrlehrer ? `${t.fahrlehrer.vorname} ${t.fahrlehrer.nachname}` : null,
      fahrzeug: t.fahrzeug?.kennzeichen ?? null,
    }));
    return { summary: `${liste.length} Termine am ${datum}`, data: { datum, termine: liste } };
  }

  if (name === "schueler_details") {
    let stud: SB = null;
    if (input.schueler_id) {
      const { data } = await supabase.from("fahrschueler").select("*").eq("id", input.schueler_id as string).maybeSingle();
      stud = data;
    } else {
      const q = String(input.name ?? "").trim();
      const { data } = await supabase.from("fahrschueler").select("*").or(`vorname.ilike.%${q}%,nachname.ilike.%${q}%`).limit(1);
      stud = (data ?? [])[0] ?? null;
    }
    if (!stud) return { summary: "Nicht gefunden", data: { error: "Schüler nicht gefunden" } };
    const klasse = stud.fuehrerscheinklassen?.[0] ?? "B";
    const p = pflichtFahrtenFuer(klasse);
    const { data: stunden } = await supabase.from("fahrstunde").select("typ, status, datum, uhrzeit").eq("schueler_id", stud.id);
    const heuteIso = iso(heute);
    let ueb = 0, aut = 0, nac = 0, abg = 0;
    let naechster: { datum: string; uhrzeit: string } | null = null;
    for (const s of (stunden ?? []) as { typ: string; status: string; datum: string; uhrzeit: string }[]) {
      if (s.status === "abgeschlossen") {
        abg += 1;
        if (s.typ === "ueberland") ueb += 1;
        else if (s.typ === "autobahn") aut += 1;
        else if (s.typ === "nacht") nac += 1;
      }
      if (s.status === "geplant" && s.datum >= heuteIso) {
        const kand = { datum: s.datum, uhrzeit: String(s.uhrzeit ?? "").slice(0, 5) };
        if (!naechster || kand.datum < naechster.datum || (kand.datum === naechster.datum && kand.uhrzeit < naechster.uhrzeit)) naechster = kand;
      }
    }
    const { data: rech } = await supabase.from("rechnung").select("betrag_brutto").eq("schueler_id", stud.id).in("status", ["offen", "ueberfaellig"]);
    const offen = (rech ?? []).reduce((a: number, r: SB) => a + Number(r.betrag_brutto ?? 0), 0);
    return {
      summary: `${stud.vorname} ${stud.nachname}`,
      data: {
        name: `${stud.vorname} ${stud.nachname}`,
        klasse,
        telefon: stud.telefon,
        email: stud.email,
        theorie_bestanden: stud.theorie_bestanden,
        abgeschlossene_fahrstunden: abg,
        sonderfahrten: { ueberland: `${ueb}/${p.ueberland}`, autobahn: `${aut}/${p.autobahn}`, nacht: `${nac}/${p.nacht}` },
        naechster_termin: naechster,
        offene_summe: offen,
      },
    };
  }

  if (name === "pruefungen_anstehend") {
    const tage = Math.max(1, Number(input.tage ?? 14) || 14);
    const bis = new Date(heute);
    bis.setDate(bis.getDate() + tage);
    const { data } = await supabase
      .from("pruefung")
      .select("datum, uhrzeit, art, pruefstelle, fahrschueler(vorname, nachname)")
      .eq("ergebnis", "offen")
      .gte("datum", iso(heute))
      .lte("datum", iso(bis))
      .order("datum", { ascending: true });
    const liste = (data ?? []).map((p: SB) => ({
      datum: p.datum,
      uhrzeit: p.uhrzeit ? String(p.uhrzeit).slice(0, 5) : null,
      art: p.art,
      pruefstelle: p.pruefstelle,
      schueler: p.fahrschueler ? `${p.fahrschueler.vorname} ${p.fahrschueler.nachname}` : null,
    }));
    return { summary: `${liste.length} Prüfungen`, data: liste };
  }

  if (name === "offene_aufgaben") {
    const { data } = await supabase
      .from("aufgabe")
      .select("titel, faellig_am, prioritaet, fahrschueler(vorname, nachname)")
      .eq("status", "offen")
      .order("faellig_am", { ascending: true, nullsFirst: false })
      .limit(50);
    const liste = (data ?? []).map((a: SB) => ({
      titel: a.titel,
      faellig_am: a.faellig_am,
      prioritaet: a.prioritaet,
      schueler: a.fahrschueler ? `${a.fahrschueler.vorname} ${a.fahrschueler.nachname}` : null,
    }));
    return { summary: `${liste.length} offene Aufgaben`, data: liste };
  }

  if (name === "umsatz_statistik") {
    const monatStart = iso(new Date(heute.getFullYear(), heute.getMonth(), 1));
    const heuteIso = iso(heute);
    const [{ data: rech }, { data: studs }, { data: stunden }] = await Promise.all([
      supabase.from("rechnung").select("betrag_brutto, status, rechnungsdatum, faelligkeitsdatum"),
      supabase.from("fahrschueler").select("anmeldedatum"),
      supabase.from("fahrstunde").select("status").gte("datum", monatStart).lte("datum", heuteIso),
    ]);
    const umsatzMonat = (rech ?? []).filter((r: SB) => r.rechnungsdatum && r.rechnungsdatum >= monatStart).reduce((a: number, r: SB) => a + Number(r.betrag_brutto ?? 0), 0);
    const offen = (rech ?? []).filter((r: SB) => r.status === "offen" || r.status === "ueberfaellig").reduce((a: number, r: SB) => a + Number(r.betrag_brutto ?? 0), 0);
    const ueberfaellig = (rech ?? [])
      .filter((r: SB) => r.status === "ueberfaellig" || (r.status !== "bezahlt" && r.faelligkeitsdatum && r.faelligkeitsdatum < heuteIso))
      .reduce((a: number, r: SB) => a + Number(r.betrag_brutto ?? 0), 0);
    const neu = (studs ?? []).filter((s: SB) => s.anmeldedatum && s.anmeldedatum >= monatStart).length;
    const fs = (stunden ?? []).filter((s: SB) => s.status !== "ausgefallen").length;
    return { summary: `Umsatz Monat ${umsatzMonat.toFixed(0)} €`, data: { umsatz_monat: umsatzMonat, offen, ueberfaellig, neue_schueler_monat: neu, fahrstunden_monat: fs } };
  }

  if (name === "schueler_anlegen") {
    const vorname = String(input.vorname ?? "").trim();
    const nachname = String(input.nachname ?? "").trim();
    if (!vorname || !nachname) return { summary: "Fehler", data: { error: "Vor- und Nachname nötig" } };
    const klasse = String(input.klasse ?? "B").trim() || "B";
    const { data, error } = await supabase
      .from("fahrschueler")
      .insert({
        fahrschule_id: fahrschuleId,
        vorname,
        nachname,
        telefon: (input.telefon as string) || null,
        email: (input.email as string) || null,
        fuehrerscheinklassen: [klasse],
        anmeldedatum: iso(heute),
        avatar_farbe: "#2CBA75",
      })
      .select("id")
      .maybeSingle();
    if (error) return { summary: "Fehler", data: { error: error.message } };
    return { summary: `${vorname} ${nachname} angelegt`, data: { ok: true, id: data?.id } };
  }

  if (name === "aufgabe_anlegen") {
    const titel = String(input.titel ?? "").trim();
    if (!titel) return { summary: "Fehler", data: { error: "Titel nötig" } };
    const { error } = await supabase.from("aufgabe").insert({
      fahrschule_id: fahrschuleId,
      titel,
      status: "offen",
      prioritaet: String(input.prioritaet ?? "mittel") || "mittel",
      faellig_am: (input.faellig_am as string) || null,
    });
    if (error) return { summary: "Fehler", data: { error: error.message } };
    return { summary: `Aufgabe „${titel}" angelegt`, data: { ok: true } };
  }

  if (name === "termin_absagen") {
    const id = String(input.fahrstunde_id ?? "");
    if (!id) return { summary: "Fehler", data: { error: "id nötig" } };
    const { error } = await supabase.from("fahrstunde").update({ status: "ausgefallen" }).eq("id", id);
    if (error) return { summary: "Fehler", data: { error: error.message } };
    return { summary: "Termin abgesagt", data: { ok: true } };
  }

  if (name === "zahlung_erfassen") {
    const betrag = Number(input.betrag ?? 0);
    if (!betrag) return { summary: "Fehler", data: { error: "Betrag nötig" } };
    const { error } = await supabase.from("zahlung").insert({
      fahrschule_id: fahrschuleId,
      schueler_id: (input.schueler_id as string) || null,
      rechnung_id: (input.rechnung_id as string) || null,
      betrag,
      datum: iso(heute),
      art: String(input.art ?? "ueberweisung") || "ueberweisung",
    });
    if (error) return { summary: "Fehler", data: { error: error.message } };
    return { summary: `Zahlung ${betrag.toFixed(2)} € erfasst`, data: { ok: true } };
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
    `Antworte kurz, freundlich und auf Deutsch. Nutze die Werkzeuge, um echte Daten der Fahrschule zu lesen oder Änderungen vorzunehmen – erfinde niemals Zahlen, Namen, Termine oder Ergebnisse. ` +
    `Bevor du etwas anlegst, änderst oder absagst (termin_anlegen, termin_absagen, schueler_anlegen, aufgabe_anlegen, zahlung_erfassen), fasse die Aktion kurz zusammen und lass sie bestätigen – außer der Nutzer hat bereits klar zugestimmt. ` +
    `Wenn dir Angaben fehlen (z. B. welcher Schüler), frag kurz nach oder nutze „schueler_finden". Formatiere Listen knapp mit Bindestrichen.`;

  const anthropic = new Anthropic();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: any[] = verlauf.map((m) => ({ role: m.role, content: m.content }));
  const actions: { tool: string; summary: string }[] = [];

  try {
    for (let runde = 0; runde < 8; runde++) {
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
