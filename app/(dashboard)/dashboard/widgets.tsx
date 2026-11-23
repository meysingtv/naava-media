import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface Ansicht {
  key: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Umschalter zwischen den Ansichten des Dashboards – dieselbe Optik wie die
 * Segmente über den Listen (weiße Schiene, aktives Segment hellblau), aber
 * als Links: jede Ansicht hat eine eigene Adresse und lädt nur ihre Daten.
 */
export function AnsichtUmschalter({ ansichten, aktiv }: { ansichten: Ansicht[]; aktiv: string }) {
  return (
    <nav
      aria-label="Ansicht des Dashboards"
      className="inline-flex h-10 max-w-full shrink-0 items-center gap-0.5 overflow-x-auto rounded-xl bg-card p-1 shadow-panel [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {ansichten.map((a) => {
        const istAktiv = a.key === aktiv;
        return (
          <Link
            key={a.key}
            href={a.key === ansichten[0].key ? "/dashboard" : `/dashboard?ansicht=${a.key}`}
            aria-current={istAktiv ? "page" : undefined}
            scroll={false}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 text-13 font-medium transition-colors duration-fast",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70",
              istAktiv ? "bg-primary-soft text-primary-text" : "text-foreground-secondary hover:bg-muted hover:text-foreground",
            )}
          >
            <a.icon className="h-4 w-4 shrink-0" strokeWidth={1.9} aria-hidden="true" />
            {a.label}
          </Link>
        );
      })}
    </nav>
  );
}

const WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

/**
 * Monatskalender: heute hervorgehoben, Punkte für Tage mit Fahrstunden
 * (blau) und Prüfungen (rot). Jeder Tag öffnet die Disposition an genau
 * diesem Tag – sofern die Rolle den Kalender sehen darf.
 */
export function MiniKalender({
  heute,
  fahrstunden,
  pruefungen,
  verlinken = true,
}: {
  heute: string;
  /** Anzahl Fahrstunden je Tag (JJJJ-MM-TT). */
  fahrstunden: Record<string, number>;
  /** Tage mit Prüfungen. */
  pruefungen: Set<string>;
  verlinken?: boolean;
}) {
  const [jahr, monat] = heute.split("-").map(Number);
  const erster = new Date(Date.UTC(jahr, monat - 1, 1));
  const versatz = (erster.getUTCDay() + 6) % 7; // Montag = 0
  const tageImMonat = new Date(Date.UTC(jahr, monat, 0)).getUTCDate();
  const zellen: (string | null)[] = [];
  for (let i = 0; i < versatz; i++) zellen.push(null);
  for (let t = 1; t <= tageImMonat; t++) zellen.push(`${jahr}-${String(monat).padStart(2, "0")}-${String(t).padStart(2, "0")}`);
  while (zellen.length % 7 !== 0) zellen.push(null);

  return (
    <div>
      <div className="grid grid-cols-7 text-center text-xs font-medium text-foreground-tertiary">
        {WOCHENTAGE.map((w) => (
          <span key={w} className="py-1.5">
            {w}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {zellen.map((iso, i) => {
          if (!iso) return <span key={`leer-${i}`} />;
          const tag = Number(iso.slice(8));
          const istHeute = iso === heute;
          const wochenende = i % 7 >= 5;
          const anzahl = fahrstunden[iso] ?? 0;
          const pruefung = pruefungen.has(iso);
          const klassen = cn(
            "mx-auto flex h-10 w-10 flex-col items-center justify-center rounded-lg text-13 tabular-nums transition-colors",
            istHeute
              ? "bg-primary font-semibold text-primary-foreground"
              : cn(
                  verlinken && "hover:bg-muted",
                  wochenende || iso < heute ? "text-foreground-tertiary" : "text-foreground",
                ),
          );
          const inhalt = (
            <>
              <span className="leading-4">{tag}</span>
              <span className="mt-0.5 flex h-1.5 items-center gap-0.5">
                {anzahl > 0 && <i className={cn("h-1 w-1 rounded-full", istHeute ? "bg-white" : "bg-primary")} aria-hidden="true" />}
                {pruefung && <i className={cn("h-1 w-1 rounded-full", istHeute ? "bg-white" : "bg-[#E0434A]")} aria-hidden="true" />}
              </span>
            </>
          );
          const titel = [anzahl ? `${anzahl} Fahrstunden` : null, pruefung ? "Prüfung" : null].filter(Boolean).join(" · ") || undefined;
          return verlinken ? (
            <Link key={iso} href={`/kalender?datum=${iso}`} title={titel} className={klassen}>
              {inhalt}
            </Link>
          ) : (
            <span key={iso} title={titel} className={klassen}>
              {inhalt}
            </span>
          );
        })}
      </div>
    </div>
  );
}
