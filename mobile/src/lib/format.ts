// Datums-/Zeit-Formatierung mit festen deutschen Bezeichnungen
// (unabhängig von der Intl-Unterstützung der JS-Engine).
const WOCHENTAGE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const WOCHENTAGE_KURZ = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const MONATE = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

const pad = (n: number) => String(n).padStart(2, "0");

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

/** "HH:MM:SS" -> "HH:MM" */
export function formatUhrzeit(uhrzeit: string): string {
  return uhrzeit ? uhrzeit.slice(0, 5) : "";
}

/** "2026-06-09" -> "Dienstag, 9. Juni" */
export function formatDatumLang(iso: string): string {
  const d = parseISO(iso);
  return `${WOCHENTAGE[d.getDay()]}, ${d.getDate()}. ${MONATE[d.getMonth()]}`;
}

/** "2026-06-09" -> "Di, 09.06." */
export function formatDatumKurz(iso: string): string {
  const d = parseISO(iso);
  return `${WOCHENTAGE_KURZ[d.getDay()]}, ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.`;
}

/** Heutiges Datum als ISO-String in lokaler Zeit (YYYY-MM-DD). */
export function heuteISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** ISO-Datum um n Tage verschieben. */
export function plusTageISO(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function initialen(vorname?: string | null, nachname?: string | null): string {
  return `${(vorname ?? "").charAt(0)}${(nachname ?? "").charAt(0)}`.toUpperCase() || "?";
}
