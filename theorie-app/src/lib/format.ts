const WOCHENTAGE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

/** „Samstag, 26. September“ */
export function datumLang(d = new Date()): string {
  return `${WOCHENTAGE[d.getDay()]}, ${d.getDate()}. ${MONATE[d.getMonth()]}`;
}

/** „26.09.“ */
export function datumKurz(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.`;
}

/** Sekunden → „12:05“ */
export function dauer(sekunden: number): string {
  const m = Math.floor(sekunden / 60);
  const s = Math.floor(sekunden % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function uhrzeit(stunde: number, minute: number): string {
  return `${String(stunde).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function tausender(n: number): string {
  return Math.round(n).toLocaleString("de-DE");
}
