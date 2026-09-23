import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Akzentfarben des Dashboards – dieselbe Familie wie die Fahrstunden-Arten. */
export const AKZENT = {
  blau: "#3565E8",
  smaragd: "#0E9A77",
  violett: "#7650E0",
  orange: "#E38A1C",
  rot: "#E0434A",
  nacht: "#2F3F8F",
  schiefer: "#6B7383",
} as const;

/** Weiße Karte des Dashboards mit Kopfzeile (Titel, Meta, Aktion). */
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

/** Ein Satz, wenn eine Karte (noch) nichts zu zeigen hat. */
export function KarteLeer({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-10 text-center text-13 text-foreground-secondary">{children}</p>;
}

/**
 * Kennzahl-Kachel: farbige Symbol-Kachel, Bezeichnung, große Zahl und eine
 * Kontextzeile. Optional ein Anteilsbalken in der Akzentfarbe (Auslastung,
 * Quote) oder eine Veränderung zum Vormonat.
 */
export function Kennzahl({
  label,
  wert,
  sub,
  icon: Icon,
  akzent,
  href,
  anteil,
  veraenderung,
  ton,
}: {
  label: string;
  wert: React.ReactNode;
  sub?: React.ReactNode;
  icon: LucideIcon;
  akzent: string;
  href?: string;
  /** 0–1: zeigt einen schmalen Balken unter der Zahl. */
  anteil?: number;
  /** Veränderung in Prozent, z. B. gegenüber dem Vormonat. */
  veraenderung?: { wert: number; label: string };
  ton?: "warnung" | "kritisch";
}) {
  const inhalt = (
    <>
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
          style={{ background: `${akzent}1A`, color: akzent }}
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
        </span>
        <p className="min-w-0 truncate text-13 font-medium text-foreground-secondary">{label}</p>
      </div>
      <p
        className={cn(
          "mt-4 truncate text-[28px] font-semibold leading-8 tracking-[-0.02em] tabular-nums",
          ton === "kritisch" ? "text-destructive-text" : "text-foreground",
        )}
      >
        {wert}
      </p>
      {anteil != null && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.max(0, Math.min(1, anteil)) * 100}%`, background: akzent }}
          />
        </div>
      )}
      {(sub || veraenderung) && (
        <p className="mt-auto flex min-w-0 items-center gap-1.5 pt-2 text-13 text-foreground-secondary">
          {veraenderung && (
            <span
              className={cn(
                "shrink-0 rounded-md px-1.5 py-px text-xs font-semibold tabular-nums",
                veraenderung.wert >= 0 ? "bg-success-soft text-success-text" : "bg-destructive-soft text-destructive-text",
              )}
            >
              {veraenderung.wert >= 0 ? "+" : "−"}
              {Math.abs(veraenderung.wert).toLocaleString("de-DE", { maximumFractionDigits: 0 })} %
            </span>
          )}
          <span className={cn("truncate", ton === "warnung" && "text-warning-text", ton === "kritisch" && "text-destructive-text")}>
            {veraenderung ? veraenderung.label : sub}
          </span>
        </p>
      )}
    </>
  );

  const klassen =
    "group flex min-w-0 flex-col rounded-xl bg-card p-5 shadow-panel transition-shadow duration-fast";

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          klassen,
          "hover:shadow-[0_0_0_1px_rgba(16,24,40,0.08),0_6px_16px_-6px_rgba(16,24,40,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        {inhalt}
      </Link>
    );
  }
  return <div className={klassen}>{inhalt}</div>;
}

/** Vier (oder weniger) Kennzahl-Kacheln nebeneinander. */
export function KennzahlReihe({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}

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

/** Kachel mit Wochentag und Tag – für Prüfungen und Termine. */
export function DatumKachel({ datum, farbe }: { datum: string; farbe: string }) {
  const d = new Date(`${datum}T12:00:00`);
  return (
    <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-[10px] text-white" style={{ background: farbe }}>
      <span className="text-[10px] font-medium leading-3 text-white/85">
        {d.toLocaleDateString("de-DE", { weekday: "short" }).replace(".", "")}
      </span>
      <span className="text-13 font-semibold leading-4 tabular-nums">{d.getDate()}.</span>
    </span>
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
