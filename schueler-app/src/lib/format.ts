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

/** Endzeit aus Startzeit + Dauer, z. B. ("09:00", 45) -> "09:45". */
export function endUhrzeit(uhrzeit: string, dauerMinuten: number): string {
  const [h, m] = uhrzeit.split(":").map(Number);
  const total = (h || 0) * 60 + (m || 0) + (dauerMinuten || 0);
  const eh = Math.floor(total / 60) % 24;
  const em = total % 60;
  return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
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

/** 1234.5 -> "1.234,50 €" (feste deutsche Schreibweise). */
export function formatEuro(betrag: number | null | undefined): string {
  const n = Number(betrag ?? 0);
  const [ganz, nach] = Math.abs(n).toFixed(2).split(".");
  const tausender = ganz.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${n < 0 ? "−" : ""}${tausender},${nach} €`;
}

/** "2026-09-25" -> "25.09.2026" */
export function formatDatum(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = parseISO(iso);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/** Zeitstempel mit Uhrzeit (z. B. created_at) → "TT.MM.JJJJ" in Ortszeit. */
export function formatZeitpunkt(zeitpunkt: string | null | undefined): string {
  if (!zeitpunkt) return "—";
  const d = new Date(zeitpunkt);
  if (Number.isNaN(d.getTime())) return "—";
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

const MONATE_KURZ = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

/** Bausteine für einen Datums-Block: 25 · Do · Sep */
export function datumTeile(iso: string): { tag: number; wochentag: string; monat: string } {
  const d = parseISO(iso);
  return { tag: d.getDate(), wochentag: WOCHENTAGE_KURZ[d.getDay()], monat: MONATE_KURZ[d.getMonth()] };
}

/** „Heute", „Morgen", „In 3 Tagen" – sonst das lange Datum. */
export function wannText(iso: string): string {
  const heute = heuteISO();
  if (iso === heute) return "Heute";
  if (iso === plusTageISO(heute, 1)) return "Morgen";
  const tage = Math.round((parseISO(iso).getTime() - parseISO(heute).getTime()) / 86_400_000);
  if (tage > 1 && tage < 7) return `In ${tage} Tagen`;
  return formatDatumLang(iso);
}
