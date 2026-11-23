import type { Fahrzeug } from "@/lib/types";
import { tageBis } from "@/lib/zeit";

/** Anzeigename: eigener Name, sonst Marke und Modell, sonst Kennzeichen. */
export function fahrzeugName(f: Pick<Fahrzeug, "name" | "marke" | "modell" | "kennzeichen">): string {
  return f.name || [f.marke, f.modell].filter(Boolean).join(" ") || f.kennzeichen;
}

/** Ausbildungsklassen – die Liste, sonst das ältere Einzelfeld. */
export function fahrzeugKlassen(f: Pick<Fahrzeug, "klassen" | "klasse">): string[] {
  if (f.klassen?.length) return f.klassen;
  return f.klasse ? [f.klasse] : [];
}

/** Nächste Hauptuntersuchung – bei zwei eingetragenen Daten (ältere Felder) das frühere. */
export function naechsteHu(f: Pick<Fahrzeug, "hauptuntersuchung" | "hu_faellig">): string | null {
  const daten = [f.hauptuntersuchung, f.hu_faellig].filter((d): d is string => Boolean(d)).sort();
  return daten[0] ?? null;
}

export type FristTon = "ueberfaellig" | "bald" | "ok";

/** Wie dringend ein Termin (HU, Wartung) ist: überfällig, bald (≤ `bald` Tage) oder in Ordnung. */
export function frist(
  datum: string | null | undefined,
  heute: string,
  bald = 30,
): { tage: number; ton: FristTon } | null {
  if (!datum) return null;
  const tage = tageBis(datum, heute);
  return { tage, ton: tage < 0 ? "ueberfaellig" : tage <= bald ? "bald" : "ok" };
}

/** „heute fällig", „in 12 Tagen", „seit 3 Tagen fällig". */
export function fristText(tage: number): string {
  if (tage < -1) return `seit ${-tage} Tagen fällig`;
  if (tage === -1) return "seit gestern fällig";
  if (tage === 0) return "heute fällig";
  if (tage === 1) return "morgen fällig";
  return `in ${tage} Tagen`;
}
