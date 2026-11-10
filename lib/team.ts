import { ROLLEN } from "@/lib/constants";
import type { Fahrlehrer } from "@/lib/types";

/** Arbeitszeit, auf die sich die Tagesauslastung bezieht (Minuten). */
export const TAGESKAPAZITAET = 8 * 60;

/** Anzeigename der Rolle – eigene Rolle vor Standardrolle. */
export function rolleName(b: Pick<Fahrlehrer, "benutzerrolle_id" | "rolle">, rollenMap: Record<string, string>): string {
  return (b.benutzerrolle_id && rollenMap[b.benutzerrolle_id]) || ROLLEN[b.rolle];
}
