// =====================================================================
// TEMPORÄRE DEMO-DATEN – nur für Screenshots/Vorführung.
// Entfernen: DEMO = false setzen (oder diesen Commit reverten).
// Die Daten kommen rein aus dem Code (kein Datenbank-Eingriff) und werden
// in den Seiten hinter `if (DEMO)` eingeblendet.
// =====================================================================
import type {
  Aufgabe,
  Fahrschueler,
  FahrstundeMitRelationen,
  FahrstundeStatus,
  FahrstundeTyp,
  Pruefung,
  PruefungArt,
  Rechnung,
  RechnungStatus,
} from "@/lib/types";

export const DEMO = true;

function isoD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function iso(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return isoD(d);
}

// ---- Stammdaten ----
export const demoLehrer = [
  { id: "d-l1", vorname: "Markus", nachname: "Weber" },
  { id: "d-l2", vorname: "Sabine", nachname: "Klein" },
  { id: "d-l3", vorname: "Tobias", nachname: "Braun" },
  { id: "d-l4", vorname: "Nadine", nachname: "Schulz" },
];
export const demoFahrzeuge = [
  { id: "d-f1", kennzeichen: "B-FS 1234" },
  { id: "d-f2", kennzeichen: "B-FS 5678" },
  { id: "d-f3", kennzeichen: "B-FS 9012" },
];
const S = [
  { id: "d-s1", vorname: "Lena", nachname: "Hoffmann", farbe: "#1A7F4E" },
  { id: "d-s2", vorname: "Mia", nachname: "Schäfer", farbe: "#2563EB" },
  { id: "d-s3", vorname: "Jonas", nachname: "Weber", farbe: "#D97706" },
  { id: "d-s4", vorname: "Ben", nachname: "Krüger", farbe: "#4F46E5" },
  { id: "d-s5", vorname: "Sophie", nachname: "Bauer", farbe: "#0F766E" },
  { id: "d-s6", vorname: "Marie", nachname: "Wagner", farbe: "#7C3AED" },
  { id: "d-s7", vorname: "Elias", nachname: "Fischer", farbe: "#0369A1" },
  { id: "d-s8", vorname: "Paul", nachname: "Schmidt", farbe: "#B91C1C" },
];

// ---- Fahrstunden heute (Leitstand + Disposition) ----
function t(o: { uhr: string; dauer: number; typ: FahrstundeTyp; status?: FahrstundeStatus; s: number; l: number; f: number }): FahrstundeMitRelationen {
  const s = S[o.s], l = demoLehrer[o.l], f = demoFahrzeuge[o.f];
  return {
    id: `d-t-${o.uhr}-${o.s}`, fahrschule_id: "demo", schueler_id: s.id, fahrlehrer_id: l.id, fahrzeug_id: f.id,
    datum: iso(0), uhrzeit: `${o.uhr}:00`, dauer_minuten: o.dauer, typ: o.typ, status: o.status ?? "geplant",
    notiz: null, unterschrift: null, bestaetigung_token: null, bestaetigt_am: null, abgesagt_am: null, erinnerung_gesendet_am: null, created_at: "",
    fahrschueler: { id: s.id, vorname: s.vorname, nachname: s.nachname, avatar_farbe: s.farbe },
    fahrlehrer: { id: l.id, vorname: l.vorname, nachname: l.nachname },
    fahrzeug: { id: f.id, kennzeichen: f.kennzeichen },
  };
}
export const demoTermineHeute: FahrstundeMitRelationen[] = [
  t({ uhr: "08:00", dauer: 45, typ: "normal", s: 0, l: 0, f: 0 }),
  t({ uhr: "09:00", dauer: 90, typ: "ueberland", s: 2, l: 1, f: 1 }),
  t({ uhr: "11:00", dauer: 45, typ: "normal", s: 1, l: 2, f: 2 }),
  t({ uhr: "13:00", dauer: 90, typ: "autobahn", s: 3, l: 0, f: 1 }),
  t({ uhr: "14:45", dauer: 45, typ: "normal", s: 4, l: 1, f: 0 }),
  t({ uhr: "15:30", dauer: 45, typ: "normal", status: "ausgefallen", s: 7, l: 2, f: 2 }),
  t({ uhr: "16:00", dauer: 45, typ: "normal", s: 6, l: 2, f: 2 }),
  t({ uhr: "19:30", dauer: 45, typ: "nacht", s: 5, l: 0, f: 0 }),
];

// ---- Disposition (Kalender) ----
export const demoKalenderStunden = demoTermineHeute;
export const demoOptions = {
  schueler: S.map((s) => ({ id: s.id, label: `${s.vorname} ${s.nachname}` })),
  fahrlehrer: demoLehrer.map((l) => ({ id: l.id, label: `${l.vorname} ${l.nachname}` })),
  fahrzeuge: demoFahrzeuge.map((f) => ({ id: f.id, label: f.kennzeichen })),
};
export const demoKalenderPruefungen: { id: string; datum: string; uhrzeit: string | null; art: PruefungArt; pruefstelle: string | null; schueler: string | null }[] = [
  { id: "d-p1", datum: iso(1), uhrzeit: "09:00", art: "praxis", pruefstelle: "TÜV Nord", schueler: "Mia Schäfer" },
  { id: "d-p2", datum: iso(2), uhrzeit: "11:00", art: "theorie", pruefstelle: "TÜV Süd", schueler: "Sophie Bauer" },
  { id: "d-p3", datum: iso(6), uhrzeit: "13:30", art: "praxis", pruefstelle: "DEKRA", schueler: "Ben Krüger" },
];

// ---- Leitstand: offene Rechnungen / Aufgaben / Prüfungen / Schüler ----
export const demoOffene: Pick<Rechnung, "id" | "betrag_brutto" | "status" | "faelligkeitsdatum" | "mahnstufe">[] = [
  { id: "d-r1", betrag_brutto: 180, status: "offen", faelligkeitsdatum: iso(10), mahnstufe: 0 },
  { id: "d-r2", betrag_brutto: 320, status: "ueberfaellig", faelligkeitsdatum: iso(-10), mahnstufe: 1 },
  { id: "d-r3", betrag_brutto: 250, status: "offen", faelligkeitsdatum: iso(12), mahnstufe: 0 },
  { id: "d-r4", betrag_brutto: 620, status: "ueberfaellig", faelligkeitsdatum: iso(-20), mahnstufe: 2 },
  { id: "d-r5", betrag_brutto: 640, status: "offen", faelligkeitsdatum: iso(14), mahnstufe: 0 },
  { id: "d-r6", betrag_brutto: 470, status: "offen", faelligkeitsdatum: iso(20), mahnstufe: 0 },
];
export const demoEingaengeMonat = 7320;

type DemoAufgabe = Aufgabe & { fahrschueler: { vorname: string; nachname: string } | null };
export const demoAufgaben: DemoAufgabe[] = [
  { id: "d-a1", fahrschule_id: "demo", titel: "TÜV-Anmeldung Mia Schäfer", status: "offen", prioritaet: "hoch", faellig_am: iso(0), schueler_id: null, created_at: "", fahrschueler: null },
  { id: "d-a2", fahrschule_id: "demo", titel: "Rechnung Jonas Weber prüfen", status: "offen", prioritaet: "mittel", faellig_am: iso(1), schueler_id: null, created_at: "", fahrschueler: null },
  { id: "d-a3", fahrschule_id: "demo", titel: "Fahrzeug B-FS 5678 zur HU", status: "offen", prioritaet: "niedrig", faellig_am: iso(5), schueler_id: null, created_at: "", fahrschueler: null },
  { id: "d-a4", fahrschule_id: "demo", titel: "Theorie-Nachweis Elias erfassen", status: "offen", prioritaet: "mittel", faellig_am: null, schueler_id: null, created_at: "", fahrschueler: null },
  { id: "d-a5", fahrschule_id: "demo", titel: "Rückruf Frau Bauer (Kostenträger)", status: "offen", prioritaet: "hoch", faellig_am: iso(0), schueler_id: null, created_at: "", fahrschueler: null },
];

type DemoPruef = Pruefung & { fahrschueler: { id: string; vorname: string; nachname: string } | null };
function pr(o: { id: string; s: number; art: PruefungArt; tage: number; ort: string }): DemoPruef {
  const s = S[o.s];
  return {
    id: o.id, fahrschule_id: "demo", schueler_id: s.id, art: o.art, klasse: "B", datum: iso(o.tage), uhrzeit: "09:00",
    pruefstelle: o.ort, ergebnis: "offen", versuch: 1, gebuehr: null, notiz: null, created_at: "",
    fahrschueler: { id: s.id, vorname: s.vorname, nachname: s.nachname },
  };
}
export const demoPruefungen: DemoPruef[] = [
  pr({ id: "d-pp1", s: 1, art: "praxis", tage: 1, ort: "TÜV Nord" }),
  pr({ id: "d-pp2", s: 4, art: "theorie", tage: 2, ort: "TÜV Süd" }),
  pr({ id: "d-pp3", s: 3, art: "praxis", tage: 6, ort: "DEKRA" }),
];

export const demoDashSchueler: Pick<
  Fahrschueler,
  "id" | "vorname" | "nachname" | "theorie_bestanden" | "theorie_termin" | "pruefung_termin" | "sehtest_am" | "erste_hilfe_am" | "passbild_ok" | "ausbildung_beendet" | "anmeldedatum"
>[] = [
  { id: "d-s1", vorname: "Lena", nachname: "Hoffmann", theorie_bestanden: false, theorie_termin: null, pruefung_termin: iso(3), sehtest_am: null, erste_hilfe_am: iso(-20), passbild_ok: true, ausbildung_beendet: false, anmeldedatum: iso(-120) },
  { id: "d-s4", vorname: "Ben", nachname: "Krüger", theorie_bestanden: false, theorie_termin: null, pruefung_termin: null, sehtest_am: null, erste_hilfe_am: null, passbild_ok: false, ausbildung_beendet: false, anmeldedatum: iso(-60) },
  { id: "d-s5", vorname: "Sophie", nachname: "Bauer", theorie_bestanden: false, theorie_termin: iso(2), pruefung_termin: null, sehtest_am: iso(-10), erste_hilfe_am: iso(-10), passbild_ok: true, ausbildung_beendet: false, anmeldedatum: iso(-75) },
  { id: "d-s7", vorname: "Elias", nachname: "Fischer", theorie_bestanden: false, theorie_termin: null, pruefung_termin: null, sehtest_am: null, erste_hilfe_am: null, passbild_ok: false, ausbildung_beendet: false, anmeldedatum: iso(-30) },
];

// ---- Cockpit ----
type CkStunde = { datum: string; dauer_minuten: number; status: FahrstundeStatus; fahrlehrer_id: string | null; fahrzeug_id: string | null };
export const demoCockpitLehrer = demoLehrer;
export const demoCockpitFahrzeuge = demoFahrzeuge;
export const demoCockpitStunden: CkStunde[] = (() => {
  const rows: CkStunde[] = [];
  const lids = demoLehrer.map((l) => l.id), fids = demoFahrzeuge.map((f) => f.id);
  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  [30, 26, 20, 14].forEach((n, li) => {
    for (let k = 0; k < n; k++) {
      const d = new Date(monday); d.setDate(d.getDate() + (k % 6));
      rows.push({ datum: isoD(d), dauer_minuten: 60, status: "geplant", fahrlehrer_id: lids[li], fahrzeug_id: fids[(li + k) % 3] });
    }
  });
  [40, 35, 28, 20].forEach((n, li) => { for (let k = 0; k < n; k++) rows.push({ datum: iso(-1 - (k % 28)), dauer_minuten: 60, status: "abgeschlossen", fahrlehrer_id: lids[li], fahrzeug_id: fids[k % 3] }); });
  [5, 3, 4, 2].forEach((n, li) => { for (let k = 0; k < n; k++) rows.push({ datum: iso(-2 - (k % 26)), dauer_minuten: 60, status: "ausgefallen", fahrlehrer_id: lids[li], fahrzeug_id: fids[k % 3] }); });
  return rows;
})();
export const demoCockpitOffene: { betrag_brutto: number; status: RechnungStatus; faelligkeitsdatum: string | null; rechnungsdatum: string }[] = [
  { betrag_brutto: 600, status: "offen", faelligkeitsdatum: iso(10), rechnungsdatum: iso(-5) },
  { betrag_brutto: 450, status: "offen", faelligkeitsdatum: iso(14), rechnungsdatum: iso(-2) },
  { betrag_brutto: 300, status: "offen", faelligkeitsdatum: iso(7), rechnungsdatum: iso(-1) },
  { betrag_brutto: 500, status: "ueberfaellig", faelligkeitsdatum: iso(-10), rechnungsdatum: iso(-40) },
  { betrag_brutto: 350, status: "ueberfaellig", faelligkeitsdatum: iso(-20), rechnungsdatum: iso(-50) },
  { betrag_brutto: 700, status: "ueberfaellig", faelligkeitsdatum: iso(-5), rechnungsdatum: iso(-35) },
  { betrag_brutto: 400, status: "ueberfaellig", faelligkeitsdatum: iso(-15), rechnungsdatum: iso(-45) },
  { betrag_brutto: 800, status: "ueberfaellig", faelligkeitsdatum: iso(-45), rechnungsdatum: iso(-75) },
  { betrag_brutto: 300, status: "ueberfaellig", faelligkeitsdatum: iso(-50), rechnungsdatum: iso(-80) },
  { betrag_brutto: 900, status: "ueberfaellig", faelligkeitsdatum: iso(-75), rechnungsdatum: iso(-100) },
  { betrag_brutto: 250, status: "ueberfaellig", faelligkeitsdatum: iso(-90), rechnungsdatum: iso(-120) },
];

// ---- Schüler-Seite ----
function fs(p: Partial<Fahrschueler> & { id: string; vorname: string; nachname: string }): Fahrschueler {
  return {
    fahrschule_id: "demo", geburtsdatum: null, strasse: null, plz: null, ort: null, telefon: null, email: null,
    fuehrerscheinklassen: ["B"], anmeldedatum: iso(-90), theorie_bestanden: false, theorie_termin: null, pruefung_termin: null,
    notizen: null, avatar_farbe: "#1A7F4E", kundennummer: null, kostentraeger: null, filiale: null, prueforganisation: null,
    preisliste: null, intensivkurs: false, iban: null, theorie_versuch: 0, praxis_versuch: 0, lernstatus: 0,
    anrede: null, geburtsort: null, staatsangehoerigkeit: null, telefon_beruflich: null, schluesselzahl: null, erteilungsart: null,
    fuehrerscheinnummer: null, kurs: null, bf17: false, zahlungsart: null, kostentraeger_email: null, vorgangsnummer: null,
    pruefort: null, sehhilfe: false, ausbildung_beendet: false, telefon_privat: null, bisherige_klasse: null, ausgabedatum: null,
    zweiter_preis: false, autom_leistungspakete: false, sepa_mandat_ref: null, sepa_mandat_am: null, sehtest_am: null,
    passbild_ok: false, erste_hilfe_am: null, antrag_gestellt_am: null, ausweis_ok: false, vertrag_unterschrift: null, vertrag_am: null,
    user_id: null, portal_code: null, portal_aktiv: false, created_at: "",
    ...p,
  } as Fahrschueler;
}
export const demoSchuelerFull: Fahrschueler[] = [
  fs({ id: "d-s1", vorname: "Lena", nachname: "Hoffmann", avatar_farbe: "#1A7F4E", telefon: "0170 1234567", email: "lena@example.de", theorie_bestanden: true, lernstatus: 90, sehtest_am: iso(-30), erste_hilfe_am: iso(-40), passbild_ok: true, ausweis_ok: true }),
  fs({ id: "d-s2", vorname: "Mia", nachname: "Schäfer", avatar_farbe: "#2563EB", telefon: "0151 2223344", email: "mia@example.de", theorie_bestanden: true, lernstatus: 100, sehtest_am: iso(-50), erste_hilfe_am: iso(-60), passbild_ok: true, ausweis_ok: true, pruefung_termin: iso(1) }),
  fs({ id: "d-s3", vorname: "Jonas", nachname: "Weber", avatar_farbe: "#D97706", telefon: "0160 5556677", email: "jonas@example.de", theorie_bestanden: true, lernstatus: 85, sehtest_am: iso(-20), passbild_ok: true }),
  fs({ id: "d-s4", vorname: "Ben", nachname: "Krüger", avatar_farbe: "#4F46E5", telefon: "0176 8889900", email: "ben@example.de", fuehrerscheinklassen: ["A"], lernstatus: 40 }),
  fs({ id: "d-s5", vorname: "Sophie", nachname: "Bauer", avatar_farbe: "#0F766E", telefon: "0170 4445566", email: "sophie@example.de", lernstatus: 55, theorie_termin: iso(2), sehtest_am: iso(-10), erste_hilfe_am: iso(-10), passbild_ok: true }),
  fs({ id: "d-s6", vorname: "Marie", nachname: "Wagner", avatar_farbe: "#7C3AED", telefon: "0152 1112233", email: "marie@example.de", fuehrerscheinklassen: ["BE"], theorie_bestanden: true, lernstatus: 95, sehtest_am: iso(-70), erste_hilfe_am: iso(-70), passbild_ok: true, ausweis_ok: true }),
  fs({ id: "d-s7", vorname: "Elias", nachname: "Fischer", avatar_farbe: "#0369A1", telefon: "0171 9998877", email: "elias@example.de", lernstatus: 30 }),
  fs({ id: "d-s8", vorname: "Paul", nachname: "Schmidt", avatar_farbe: "#B91C1C", telefon: "0157 3334455", email: "paul@example.de", lernstatus: 12 }),
];

// Lektions-Rohdaten je Schüler (steuert Fortschrittsbalken)
type LessonRow = { schueler_id: string | null; typ: string; status: string; fahrlehrer: { vorname: string; nachname: string } | null };
export const demoSchuelerLessonRows: LessonRow[] = (() => {
  const rows: LessonRow[] = [];
  // [normal, ueberland, autobahn, nacht] abgeschlossen je Schüler
  const plan: Record<string, [number, number, number, number]> = {
    "d-s1": [18, 4, 3, 2], "d-s2": [24, 5, 4, 3], "d-s3": [14, 3, 1, 2], "d-s4": [8, 1, 0, 0],
    "d-s5": [11, 2, 1, 1], "d-s6": [22, 5, 4, 3], "d-s7": [6, 0, 0, 0], "d-s8": [2, 0, 0, 0],
  };
  const typen: FahrstundeTyp[] = ["normal", "ueberland", "autobahn", "nacht"];
  Object.entries(plan).forEach(([sid, counts], idx) => {
    counts.forEach((n, ti) => {
      for (let k = 0; k < n; k++) rows.push({ schueler_id: sid, typ: typen[ti], status: "abgeschlossen", fahrlehrer: demoLehrer[idx % demoLehrer.length] });
    });
  });
  return rows;
})();
export const demoSchuelerRechnungRows: { schueler_id: string | null; betrag_brutto: number | null; status: string }[] = [
  { schueler_id: "d-s3", betrag_brutto: 180, status: "offen" },
  { schueler_id: "d-s4", betrag_brutto: 320, status: "offen" },
  { schueler_id: "d-s5", betrag_brutto: 90, status: "offen" },
  { schueler_id: "d-s6", betrag_brutto: 250, status: "offen" },
  { schueler_id: "d-s1", betrag_brutto: 640, status: "bezahlt" },
];
