import { redirect } from "next/navigation";

import { BEREICHE } from "@/components/shared/bereiche";
import { getKontext } from "@/lib/supabase/queries";
import type { FahrlehrerRolle } from "@/lib/types";

/**
 * Zugriff nach Rolle – dieselben Freigaben wie in der Navigation
 * (`BEREICHE`). Was im Menü für eine Rolle nicht erscheint, ist auch über
 * die Adresszeile nicht erreichbar.
 */

/** Rollen, die eine Seite sehen dürfen; `null` = alle. */
export function rollenFuer(href: string): FahrlehrerRolle[] | null {
  for (const b of BEREICHE) for (const i of b.items) if (i.href === href) return i.rollen;
  return null;
}

/** Rolle des angemeldeten Nutzers – ohne Datensatz gilt die engste Rolle. */
export async function aktuelleRolle(): Promise<FahrlehrerRolle> {
  const kontext = await getKontext();
  return kontext?.fahrlehrer?.rolle ?? "fahrlehrer";
}

export async function darf(href: string): Promise<boolean> {
  const rollen = rollenFuer(href);
  return !rollen || rollen.includes(await aktuelleRolle());
}

/** Für Layouts geschützter Bereiche: ohne Freigabe zurück aufs Dashboard. */
export async function nurMitZugriff(href: string): Promise<void> {
  if (!(await darf(href))) redirect("/dashboard");
}

/** Umsatz, Einnahmen und Vergleiche sieht nur die Geschäftsführung – das Büro sieht offene Posten. */
export async function siehtUmsatz(): Promise<boolean> {
  return (await aktuelleRolle()) === "chef";
}
