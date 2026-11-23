"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import { pflichtFahrtenFuer } from "@/lib/constants";
import type { FahrstundeStatus, FahrstundeTyp } from "@/lib/types";

export interface KalenderState {
  error?: string;
  ok?: boolean;
}

function leerZuNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

function minutenSeitMitternacht(uhrzeit: string): number {
  const [h, m] = uhrzeit.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Legt eine Fahrstunde an oder aktualisiert sie (abhängig vom Feld `id`). */
export async function fahrstundeSpeichern(
  _prev: KalenderState,
  formData: FormData,
): Promise<KalenderState> {
  const kontext = await getKontext();
  if (!kontext?.fahrschule) {
    return { error: "Keine Fahrschule gefunden." };
  }

  const id = leerZuNull(formData.get("id"));
  const datum = leerZuNull(formData.get("datum"));
  const uhrzeit = leerZuNull(formData.get("uhrzeit"));
  if (!datum || !uhrzeit) {
    return { error: "Bitte Datum und Uhrzeit angeben." };
  }

  const dauer = Number(formData.get("dauer_minuten") ?? 45) || 45;
  const fahrzeugId = leerZuNull(formData.get("fahrzeug_id"));

  const supabase = createClient();

  // Fahrzeug-Konflikterkennung (eigene Stunde beim Bearbeiten ausschließen).
  if (fahrzeugId) {
    let query = supabase
      .from("fahrstunde")
      .select("id, uhrzeit, dauer_minuten")
      .eq("fahrzeug_id", fahrzeugId)
      .eq("datum", datum)
      .neq("status", "ausgefallen");
    if (id) query = query.neq("id", id);

    const { data: bestehende } = await query;
    const start = minutenSeitMitternacht(uhrzeit);
    const ende = start + dauer;
    const konflikt = (bestehende ?? []).some((b: { uhrzeit: string; dauer_minuten: number | null }) => {
      const bStart = minutenSeitMitternacht(b.uhrzeit);
      const bEnde = bStart + (b.dauer_minuten ?? 45);
      return start < bEnde && ende > bStart;
    });
    if (konflikt) {
      return { error: "Dieses Fahrzeug ist zu dieser Zeit bereits gebucht." };
    }
  }

  const datensatz = {
    schueler_id: leerZuNull(formData.get("schueler_id")),
    fahrlehrer_id: leerZuNull(formData.get("fahrlehrer_id")),
    fahrzeug_id: fahrzeugId,
    datum,
    uhrzeit,
    dauer_minuten: dauer,
    typ: (String(formData.get("typ") ?? "normal") as FahrstundeTyp) || "normal",
    notiz: leerZuNull(formData.get("notiz")),
  };

  if (id) {
    const { error } = await supabase.from("fahrstunde").update(datensatz).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("fahrstunde").insert({
      ...datensatz,
      fahrschule_id: kontext.fahrschule.id,
      status: "geplant",
    });
    if (error) return { error: error.message };
  }

  revalidatePath("/kalender");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function fahrstundeStatusSetzen(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "geplant") as FahrstundeStatus;
  if (!id) return;

  const supabase = createClient();
  await supabase.from("fahrstunde").update({ status }).eq("id", id);
  revalidatePath("/kalender");
  revalidatePath("/dashboard");
}

export async function fahrstundeLoeschen(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  await supabase.from("fahrstunde").delete().eq("id", id);
  revalidatePath("/kalender");
  revalidatePath("/dashboard");
}

// =====================================================================
// Smart-Disposition: nächste sinnvolle Fahrstunde vorschlagen
// =====================================================================
export interface DispoVorschlag {
  schueler_id: string;
  schuelerName: string;
  klasse: string;
  typ: FahrstundeTyp;
  begruendung: string;
  datum: string;
  uhrzeit: string;
  dauer_minuten: number;
  fahrlehrer_id: string | null;
  fahrlehrerName: string | null;
  fahrzeug_id: string | null;
  fahrzeugKennzeichen: string | null;
  fortschritt: { ueberland: [number, number]; autobahn: [number, number]; nacht: [number, number] };
}

export type VorschlagErgebnis = { ok: true; vorschlag: DispoVorschlag } | { ok: false; error: string };

const TAG_START_MIN = 8 * 60; // 08:00
const TAG_ENDE_MIN = 18 * 60; // 18:00

function isoTag(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function minZuUhrzeit(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

type Belegung = { datum: string; uhrzeit: string; dauer_minuten: number | null; fahrlehrer_id: string | null; fahrzeug_id: string | null; schueler_id: string | null };

/** Prüft, ob eine Ressource (per Filter) am Tag im Zeitfenster frei ist. */
function istFrei(belegt: Belegung[], feld: keyof Belegung, id: string, datum: string, startMin: number, dauer: number): boolean {
  const ende = startMin + dauer;
  return !belegt.some((b) => {
    if (b.datum !== datum || b[feld] !== id) return false;
    const bStart = minutenSeitMitternacht(b.uhrzeit);
    const bEnde = bStart + (b.dauer_minuten ?? 45);
    return startMin < bEnde && ende > bStart;
  });
}

/**
 * Ermittelt die nächste sinnvolle Fahrstunde: zuerst die offenen
 * Pflicht-Sonderfahrten (Überland → Autobahn → Nacht), sonst eine reguläre
 * Übungsstunde; dann den frühesten freien Slot (Fahrlehrer + Fahrzeug frei).
 */
export async function smartVorschlagBerechnen(schuelerId: string): Promise<VorschlagErgebnis> {
  if (!schuelerId) return { ok: false, error: "Bitte einen Schüler wählen." };
  const kontext = await getKontext();
  if (!kontext?.fahrschule) return { ok: false, error: "Keine Fahrschule gefunden." };
  const supabase = createClient();

  const { data: schueler } = await supabase
    .from("fahrschueler")
    .select("id, vorname, nachname, fuehrerscheinklassen")
    .eq("id", schuelerId)
    .maybeSingle();
  if (!schueler) return { ok: false, error: "Schüler nicht gefunden." };

  const klasse = (schueler.fuehrerscheinklassen && schueler.fuehrerscheinklassen[0]) || "B";
  const pflicht = pflichtFahrtenFuer(klasse);

  // Bereits abgeschlossene Fahrten je Typ.
  const { data: erledigt } = await supabase
    .from("fahrstunde")
    .select("typ")
    .eq("schueler_id", schuelerId)
    .eq("status", "abgeschlossen")
    .returns<{ typ: FahrstundeTyp }[]>();
  const zahl = { ueberland: 0, autobahn: 0, nacht: 0 };
  for (const r of erledigt ?? []) if (r.typ === "ueberland" || r.typ === "autobahn" || r.typ === "nacht") zahl[r.typ] += 1;

  let typ: FahrstundeTyp = "normal";
  let begruendung = "Pflicht-Sonderfahrten vollständig – reguläre Übungsstunde.";
  if (zahl.ueberland < pflicht.ueberland) {
    typ = "ueberland";
    begruendung = `Überlandfahrten ${zahl.ueberland}/${pflicht.ueberland} – nächste Pflichtfahrt offen.`;
  } else if (zahl.autobahn < pflicht.autobahn) {
    typ = "autobahn";
    begruendung = `Autobahnfahrten ${zahl.autobahn}/${pflicht.autobahn} – nächste Pflichtfahrt offen.`;
  } else if (zahl.nacht < pflicht.nacht) {
    typ = "nacht";
    begruendung = `Nachtfahrten ${zahl.nacht}/${pflicht.nacht} – nächste Pflichtfahrt offen.`;
  }

  const dauer = typ === "ueberland" || typ === "autobahn" ? 90 : 45;

  // Ressourcen + Belegung der nächsten 21 Tage.
  const heute = new Date();
  const abIso = isoTag(heute);
  const bis = new Date(heute);
  bis.setDate(bis.getDate() + 21);
  const bisIso = isoTag(bis);

  const [lehrerRes, fahrzeugRes, belegtRes] = await Promise.all([
    supabase.from("fahrlehrer").select("id, vorname, nachname").eq("aktiv", true).order("nachname"),
    supabase.from("fahrzeug").select("id, kennzeichen").eq("aktiv", true).order("kennzeichen"),
    supabase
      .from("fahrstunde")
      .select("datum, uhrzeit, dauer_minuten, fahrlehrer_id, fahrzeug_id, schueler_id")
      .gte("datum", abIso)
      .lte("datum", bisIso)
      .neq("status", "ausgefallen")
      .returns<Belegung[]>(),
  ]);

  const lehrer = (lehrerRes.data ?? []) as { id: string; vorname: string; nachname: string }[];
  const fahrzeuge = (fahrzeugRes.data ?? []) as { id: string; kennzeichen: string }[];
  const belegt = belegtRes.data ?? [];

  // Fahrlehrer nach geringster Auslastung (freiester zuerst).
  const last: Record<string, number> = {};
  for (const b of belegt) if (b.fahrlehrer_id) last[b.fahrlehrer_id] = (last[b.fahrlehrer_id] ?? 0) + (b.dauer_minuten ?? 45);
  const lehrerSortiert = [...lehrer].sort((a, b) => (last[a.id] ?? 0) - (last[b.id] ?? 0));

  // Frühesten Slot suchen: ab morgen, Mo–Sa, 08–18 Uhr, 45-Min-Raster.
  let gewaehlt: { datum: string; startMin: number; lehrerId: string | null; fahrzeugId: string | null } | null = null;
  for (let tag = 1; tag <= 21 && !gewaehlt; tag++) {
    const d = new Date(heute);
    d.setDate(d.getDate() + tag);
    if (d.getDay() === 0) continue; // Sonntag überspringen
    const datum = isoTag(d);
    for (let start = TAG_START_MIN; start + dauer <= TAG_ENDE_MIN && !gewaehlt; start += 45) {
      const lehrerId = lehrerSortiert.find((l) => istFrei(belegt, "fahrlehrer_id", l.id, datum, start, dauer))?.id ?? null;
      if (lehrer.length > 0 && !lehrerId) continue;
      const fahrzeugId = fahrzeuge.find((f) => istFrei(belegt, "fahrzeug_id", f.id, datum, start, dauer))?.id ?? null;
      if (fahrzeuge.length > 0 && !fahrzeugId) continue;
      const schuelerFrei = istFrei(belegt, "schueler_id", schuelerId, datum, start, dauer);
      if (!schuelerFrei) continue;
      gewaehlt = { datum, startMin: start, lehrerId, fahrzeugId };
    }
  }

  if (!gewaehlt) {
    const d = new Date(heute);
    d.setDate(d.getDate() + 1);
    gewaehlt = { datum: isoTag(d), startMin: TAG_START_MIN, lehrerId: lehrerSortiert[0]?.id ?? null, fahrzeugId: fahrzeuge[0]?.id ?? null };
  }

  const lehrerObj = lehrer.find((l) => l.id === gewaehlt!.lehrerId) ?? null;
  const fahrzeugObj = fahrzeuge.find((f) => f.id === gewaehlt!.fahrzeugId) ?? null;

  return {
    ok: true,
    vorschlag: {
      schueler_id: schuelerId,
      schuelerName: `${schueler.vorname} ${schueler.nachname}`,
      klasse,
      typ,
      begruendung,
      datum: gewaehlt.datum,
      uhrzeit: minZuUhrzeit(gewaehlt.startMin),
      dauer_minuten: dauer,
      fahrlehrer_id: gewaehlt.lehrerId,
      fahrlehrerName: lehrerObj ? `${lehrerObj.vorname} ${lehrerObj.nachname}` : null,
      fahrzeug_id: gewaehlt.fahrzeugId,
      fahrzeugKennzeichen: fahrzeugObj?.kennzeichen ?? null,
      fortschritt: {
        ueberland: [zahl.ueberland, pflicht.ueberland],
        autobahn: [zahl.autobahn, pflicht.autobahn],
        nacht: [zahl.nacht, pflicht.nacht],
      },
    },
  };
}

/** Legt einen vorgeschlagenen Termin an. */
export async function terminAusVorschlag(input: {
  schueler_id: string;
  fahrlehrer_id: string | null;
  fahrzeug_id: string | null;
  datum: string;
  uhrzeit: string;
  dauer_minuten: number;
  typ: FahrstundeTyp;
}): Promise<{ ok: boolean; error?: string }> {
  const kontext = await getKontext();
  if (!kontext?.fahrschule) return { ok: false, error: "Keine Fahrschule gefunden." };
  if (!input.datum || !input.uhrzeit) return { ok: false, error: "Datum und Uhrzeit fehlen." };

  const supabase = createClient();

  // Fahrzeug-Konflikt final prüfen (falls inzwischen belegt).
  if (input.fahrzeug_id) {
    const { data: bestehende } = await supabase
      .from("fahrstunde")
      .select("uhrzeit, dauer_minuten")
      .eq("fahrzeug_id", input.fahrzeug_id)
      .eq("datum", input.datum)
      .neq("status", "ausgefallen");
    const start = minutenSeitMitternacht(input.uhrzeit);
    const ende = start + input.dauer_minuten;
    const konflikt = (bestehende ?? []).some((b: { uhrzeit: string; dauer_minuten: number | null }) => {
      const bStart = minutenSeitMitternacht(b.uhrzeit);
      const bEnde = bStart + (b.dauer_minuten ?? 45);
      return start < bEnde && ende > bStart;
    });
    if (konflikt) return { ok: false, error: "Fahrzeug inzwischen belegt – bitte neu berechnen." };
  }

  const { error } = await supabase.from("fahrstunde").insert({
    fahrschule_id: kontext.fahrschule.id,
    schueler_id: input.schueler_id || null,
    fahrlehrer_id: input.fahrlehrer_id,
    fahrzeug_id: input.fahrzeug_id,
    datum: input.datum,
    uhrzeit: input.uhrzeit,
    dauer_minuten: input.dauer_minuten,
    typ: input.typ,
    status: "geplant",
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/kalender");
  revalidatePath("/dashboard");
  revalidatePath("/cockpit");
  return { ok: true };
}
