/**
 * Zeit-Hilfen für das Dashboard – alles in deutscher Zeit (Europe/Berlin),
 * damit „heute" und „jetzt" auch kurz nach Mitternacht stimmen, wenn der
 * Server in UTC läuft.
 */
const ZONE = "Europe/Berlin";

/** Heutiges Datum in Berlin als JJJJ-MM-TT. */
export function heuteBerlin(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** Minuten seit Mitternacht (Berlin). */
export function jetztMinutenBerlin(): number {
  const [h, m] = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: ZONE })
    .format(new Date())
    .split(":")
    .map(Number);
  return (h % 24) * 60 + m;
}

/** Datum JJJJ-MM-TT um `n` Tage verschoben. */
export function plusTage(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Montag der Woche, in der `iso` liegt. */
export function wochenbeginn(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return plusTage(iso, -((d.getUTCDay() + 6) % 7));
}

export function gruss(minuten: number): string {
  if (minuten < 11 * 60) return "Guten Morgen";
  if (minuten < 18 * 60) return "Guten Tag";
  return "Guten Abend";
}

export function datumLang(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function wochentagKurz(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("de-DE", { weekday: "short", timeZone: "UTC" }).replace(".", "");
}

export function minutenVon(uhrzeit: string): number {
  const [h, m] = uhrzeit.split(":").map(Number);
  return h * 60 + m;
}

export function alsUhrzeit(min: number): string {
  return `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

export function stunden(minuten: number): string {
  return `${(minuten / 60).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Std.`;
}

/** „in 35 Min.", „in 2 Std. 5 Min." */
export function dauerText(minuten: number): string {
  if (minuten < 60) return `${minuten} Min.`;
  const h = Math.floor(minuten / 60);
  const m = minuten % 60;
  return m ? `${h} Std. ${m} Min.` : `${h} Std.`;
}
