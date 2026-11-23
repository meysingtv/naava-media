import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Eigene Schriftgrößen und Schatten aus tailwind.config.ts bekannt machen.
// Ohne das hält tailwind-merge z. B. `text-kpi` für eine Textfarbe und
// wirft sie weg, sobald daneben `text-foreground` steht.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["2xs", "13", "title", "kpi", "kpi-lg"] }],
      shadow: [{ shadow: ["panel", "card", "lift", "cta"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formatiert einen Betrag als deutschen Euro-Betrag, z. B. 1234.5 → "1.234,50 €" */
export function formatEuro(value: number | null | undefined): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value ?? 0);
}

/** Formatiert ein ISO-Datum (YYYY-MM-DD) als deutsches Datum, z. B. "09.06.2026" */
export function formatDatum(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/** Formatiert eine Uhrzeit (HH:MM[:SS]) → "HH:MM" */
export function formatUhrzeit(value: string | null | undefined): string {
  if (!value) return "—";
  return value.slice(0, 5);
}

/** Initialen aus Vor- und Nachname, z. B. "Max Mustermann" → "MM" */
export function initialen(vorname?: string | null, nachname?: string | null): string {
  const v = vorname?.trim()?.[0] ?? "";
  const n = nachname?.trim()?.[0] ?? "";
  const result = `${v}${n}`.toUpperCase();
  return result || "?";
}
