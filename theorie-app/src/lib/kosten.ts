import { useEffect, useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Führerschein-Kostenplaner. Alles bleibt nur auf diesem Gerät (Geldsachen
 * sind privat). Ohne eigene Preise rechnet die App mit Durchschnittswerten
 * für Klasse B in Deutschland.
 */

export type PreisId =
  | "grundbetrag"
  | "fahrstunde"
  | "ueberland"
  | "autobahn"
  | "nacht"
  | "vorstellungTheorie"
  | "vorstellungPraxis"
  | "pruefungTheorie"
  | "pruefungPraxis"
  | "sehtest"
  | "ersteHilfe"
  | "passbild"
  | "antrag";

export type Zahlung = { id: string; betrag: number; datum: string; notiz: string };

export type Kosten = {
  preise: Record<PreisId, number>;
  /** Vom Nutzer geänderte Preise (sonst Durchschnitt). */
  eigen: Partial<Record<PreisId, true>>;
  /** Geschätzte normale Fahrstunden insgesamt. */
  stundenGeplant: number;
  erledigt: { fahrstunden: number; ueberland: number; autobahn: number; nacht: number };
  zahlungen: Zahlung[];
  /** In den Einstellungen ausschaltbar: Karte auf Home und Zeile im Profil. */
  sichtbar: boolean;
};

export const PREISE: { id: PreisId; titel: string; unter: string; gruppe: "fahrschule" | "pruefung" | "sonstiges" }[] = [
  { id: "grundbetrag", titel: "Grundbetrag", unter: "Anmeldung und Theorieunterricht", gruppe: "fahrschule" },
  { id: "fahrstunde", titel: "Fahrstunde", unter: "Übungsstunde, 45 Minuten", gruppe: "fahrschule" },
  { id: "ueberland", titel: "Überlandfahrt", unter: "Sonderfahrt, je 45 Minuten", gruppe: "fahrschule" },
  { id: "autobahn", titel: "Autobahnfahrt", unter: "Sonderfahrt, je 45 Minuten", gruppe: "fahrschule" },
  { id: "nacht", titel: "Nachtfahrt", unter: "Sonderfahrt, je 45 Minuten", gruppe: "fahrschule" },
  { id: "vorstellungTheorie", titel: "Vorstellung Theorieprüfung", unter: "an die Fahrschule", gruppe: "pruefung" },
  { id: "vorstellungPraxis", titel: "Vorstellung praktische Prüfung", unter: "an die Fahrschule", gruppe: "pruefung" },
  { id: "pruefungTheorie", titel: "Gebühr Theorieprüfung", unter: "TÜV oder DEKRA", gruppe: "pruefung" },
  { id: "pruefungPraxis", titel: "Gebühr praktische Prüfung", unter: "TÜV oder DEKRA", gruppe: "pruefung" },
  { id: "sehtest", titel: "Sehtest", unter: "beim Optiker", gruppe: "sonstiges" },
  { id: "ersteHilfe", titel: "Erste-Hilfe-Kurs", unter: "ein Tag", gruppe: "sonstiges" },
  { id: "passbild", titel: "Passbild", unter: "biometrisch", gruppe: "sonstiges" },
  { id: "antrag", titel: "Antrag Führerschein", unter: "Führerscheinstelle", gruppe: "sonstiges" },
];

/** Grobe Durchschnittswerte (Klasse B) – nur Anhaltspunkte. */
export const DURCHSCHNITT: Record<PreisId, number> = {
  grundbetrag: 400,
  fahrstunde: 65,
  ueberland: 80,
  autobahn: 80,
  nacht: 80,
  vorstellungTheorie: 100,
  vorstellungPraxis: 200,
  pruefungTheorie: 25,
  pruefungPraxis: 130,
  sehtest: 7,
  ersteHilfe: 50,
  passbild: 15,
  antrag: 45,
};

/** Pflicht-Sonderfahrten Klasse B (je 45 Minuten). */
export const SONDER_PFLICHT = { ueberland: 5, autobahn: 4, nacht: 3 } as const;
export const STUNDEN_SCHNITT = 25;

const SPEICHER = "spur-kosten-v1";
const LEER: Kosten = {
  preise: { ...DURCHSCHNITT },
  eigen: {},
  stundenGeplant: STUNDEN_SCHNITT,
  erledigt: { fahrstunden: 0, ueberland: 0, autobahn: 0, nacht: 0 },
  zahlungen: [],
  sichtbar: true,
};

let stand: Kosten = LEER;
let geladen = false;
const hoerer = new Set<() => void>();

function setzen(neu: Kosten) {
  stand = neu;
  hoerer.forEach((h) => h());
  AsyncStorage.setItem(SPEICHER, JSON.stringify(neu)).catch(() => {});
}

async function laden() {
  if (geladen) return;
  geladen = true;
  try {
    const roh = await AsyncStorage.getItem(SPEICHER);
    if (roh) {
      const k = JSON.parse(roh) as Partial<Kosten>;
      stand = { ...LEER, ...k, preise: { ...DURCHSCHNITT, ...(k.preise ?? {}) }, erledigt: { ...LEER.erledigt, ...(k.erledigt ?? {}) }, zahlungen: k.zahlungen ?? [] };
      hoerer.forEach((h) => h());
    }
  } catch {
    // leer lassen
  }
}

export function useKosten(): Kosten {
  const k = useSyncExternalStore(
    (h) => {
      hoerer.add(h);
      return () => hoerer.delete(h);
    },
    () => stand,
  );
  useEffect(() => {
    laden();
  }, []);
  return k;
}

export function preisSetzen(id: PreisId, wert: number) {
  setzen({ ...stand, preise: { ...stand.preise, [id]: Math.max(0, Math.round(wert)) }, eigen: { ...stand.eigen, [id]: true } });
}

export function kostenSichtbarSetzen(an: boolean) {
  setzen({ ...stand, sichtbar: an });
}

export function preiseZuruecksetzen() {
  setzen({ ...stand, preise: { ...DURCHSCHNITT }, eigen: {} });
}

export function stundenGeplantSetzen(n: number) {
  setzen({ ...stand, stundenGeplant: Math.max(0, Math.min(150, Math.round(n))) });
}

export function erledigtSetzen(art: keyof Kosten["erledigt"], n: number) {
  setzen({ ...stand, erledigt: { ...stand.erledigt, [art]: Math.max(0, Math.min(150, Math.round(n))) } });
}

export function zahlungHinzufuegen(betrag: number, notiz: string) {
  const z: Zahlung = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, betrag: Math.round(betrag * 100) / 100, datum: new Date().toISOString(), notiz: notiz.trim().slice(0, 60) };
  setzen({ ...stand, zahlungen: [z, ...stand.zahlungen] });
}

export function zahlungLoeschen(id: string) {
  setzen({ ...stand, zahlungen: stand.zahlungen.filter((z) => z.id !== id) });
}

/** Gesamtsumme, bezahlt und offen. */
export function rechnen(k: Kosten) {
  const p = k.preise;
  const stunden = Math.max(k.stundenGeplant, k.erledigt.fahrstunden);
  const posten = {
    fahrschule: p.grundbetrag + p.fahrstunde * stunden + p.ueberland * Math.max(SONDER_PFLICHT.ueberland, k.erledigt.ueberland) + p.autobahn * Math.max(SONDER_PFLICHT.autobahn, k.erledigt.autobahn) + p.nacht * Math.max(SONDER_PFLICHT.nacht, k.erledigt.nacht),
    pruefung: p.vorstellungTheorie + p.vorstellungPraxis + p.pruefungTheorie + p.pruefungPraxis,
    sonstiges: p.sehtest + p.ersteHilfe + p.passbild + p.antrag,
  };
  const gesamt = posten.fahrschule + posten.pruefung + posten.sonstiges;
  const bezahlt = k.zahlungen.reduce((s, z) => s + z.betrag, 0);
  return { posten, gesamt, bezahlt, offen: Math.max(0, gesamt - bezahlt), stunden, eigenePreise: Object.keys(k.eigen).length > 0 };
}

export function euro(n: number, nachkomma = false): string {
  return `${n.toLocaleString("de-DE", { minimumFractionDigits: nachkomma ? 2 : 0, maximumFractionDigits: nachkomma ? 2 : 0 })} €`;
}
