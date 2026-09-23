import Link from "next/link";

import { cn } from "@/lib/utils";

/** Weiße Karte des Leitstands mit Kopfzeile (Titel, Meta, Aktion). */
export function Karte({
  titel,
  meta,
  aktion,
  children,
  className,
  inhaltClassName,
}: {
  titel: React.ReactNode;
  meta?: React.ReactNode;
  aktion?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  inhaltClassName?: string;
}) {
  return (
    <section className={cn("flex min-w-0 flex-col rounded-xl bg-card shadow-panel", className)}>
      <header className="flex min-h-[52px] items-center justify-between gap-3 px-5 pt-1">
        <div className="flex min-w-0 items-baseline gap-2">
          <h2 className="truncate text-[15px] font-semibold text-foreground">{titel}</h2>
          {meta && <span className="truncate text-13 text-foreground-tertiary">{meta}</span>}
        </div>
        {aktion && <div className="flex shrink-0 items-center gap-2">{aktion}</div>}
      </header>
      <div className={cn("min-h-0 flex-1", inhaltClassName)}>{children}</div>
    </section>
  );
}

/** Dezenter Link oben rechts in einer Karte. */
export function KartenLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-13 font-medium text-primary-text transition-colors hover:text-primary-hover hover:underline">
      {children}
    </Link>
  );
}

/**
 * Fortschrittsring als SVG: Anteil `wert / max`, Farbe frei wählbar, in der
 * Mitte ein Inhalt (z. B. „7/20").
 */
export function Ring({
  wert,
  max,
  farbe,
  groesse = 112,
  staerke = 9,
  children,
  label,
}: {
  wert: number;
  max: number;
  farbe: string;
  groesse?: number;
  staerke?: number;
  children?: React.ReactNode;
  label: string;
}) {
  const r = (groesse - staerke) / 2;
  const umfang = 2 * Math.PI * r;
  const anteil = max > 0 ? Math.min(1, wert / max) : 0;
  return (
    <div className="relative shrink-0" style={{ width: groesse, height: groesse }} role="img" aria-label={label}>
      <svg width={groesse} height={groesse} viewBox={`0 0 ${groesse} ${groesse}`} className="-rotate-90">
        <circle cx={groesse / 2} cy={groesse / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={staerke} />
        <circle
          cx={groesse / 2}
          cy={groesse / 2}
          r={r}
          fill="none"
          stroke={farbe}
          strokeWidth={staerke}
          strokeLinecap="round"
          strokeDasharray={`${umfang * anteil} ${umfang}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

/** Schmaler Balken mit Farbe – für Kurse, Auslastung, Quoten. */
export function Balken({ anteil, farbe, className }: { anteil: number; farbe: string; className?: string }) {
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-muted", className)}>
      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(1, anteil)) * 100}%`, background: farbe }} />
    </div>
  );
}

const WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

/**
 * Monatskalender für den Leitstand: heute hervorgehoben, Punkte für Tage
 * mit Fahrstunden (blau) und Prüfungen (rot). Jeder Tag öffnet die
 * Disposition an genau diesem Tag.
 */
export function MiniKalender({
  heute,
  fahrstunden,
  pruefungen,
}: {
  heute: string;
  /** Anzahl Fahrstunden je Tag (JJJJ-MM-TT). */
  fahrstunden: Record<string, number>;
  /** Tage mit Prüfungen. */
  pruefungen: Set<string>;
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
          return (
            <Link
              key={iso}
              href={`/kalender?datum=${iso}`}
              title={[anzahl ? `${anzahl} Fahrstunden` : null, pruefung ? "Prüfung" : null].filter(Boolean).join(" · ") || undefined}
              className={cn(
                "group mx-auto flex h-10 w-10 flex-col items-center justify-center rounded-lg text-13 tabular-nums transition-colors",
                istHeute
                  ? "bg-primary font-semibold text-primary-foreground"
                  : cn("hover:bg-muted", wochenende ? "text-foreground-tertiary" : "text-foreground", iso < heute && "text-foreground-tertiary"),
              )}
            >
              <span className="leading-4">{tag}</span>
              <span className="mt-0.5 flex h-1.5 items-center gap-0.5">
                {anzahl > 0 && (
                  <i className={cn("h-1 w-1 rounded-full", istHeute ? "bg-white" : "bg-primary")} aria-hidden="true" />
                )}
                {pruefung && (
                  <i className={cn("h-1 w-1 rounded-full", istHeute ? "bg-white" : "bg-[#E0434A]")} aria-hidden="true" />
                )}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
