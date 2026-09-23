"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";

export interface KpiDelta {
  value: number;
  unit?: "percent" | "currency" | "absolute";
  /** Vergleichszeitraum, z. B. „vs. Vormonat". */
  label?: string;
  /** true = weniger ist besser (Überfällig, Ausfälle). Dreht die Bewertung, nicht das Vorzeichen. */
  invert?: boolean;
}

export interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  /** Kontextzeile: „12 Rechnungen · fällig ≤ 30 Tage". */
  sub?: React.ReactNode;
  delta?: KpiDelta;
  /** 6–30 Werte → Sparkline 72 × 24 px. Ohne Werte bleibt der Platz leer. */
  trend?: number[];
  tone?: "neutral" | "success" | "warning" | "destructive" | "info";
  href?: string;
  /** Kleines Symbol oben rechts in einer getönten Kachel (als Element übergeben). */
  icon?: React.ReactNode;
  /** Farbe der Symbol-Kachel (Hex), Standard Kobaltblau. */
  akzent?: string;
  size?: "default" | "lg";
  loading?: boolean;
  className?: string;
}

const strichfarbe = {
  neutral: "stroke-primary",
  success: "stroke-success",
  warning: "stroke-warning",
  destructive: "stroke-destructive",
  info: "stroke-info",
} as const;

function formatDelta(d: KpiDelta): string {
  const vorzeichen = d.value > 0 ? "+" : d.value < 0 ? "−" : "±";
  const betrag = Math.abs(d.value);
  if (d.unit === "percent") return `${vorzeichen}${betrag.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %`;
  if (d.unit === "currency")
    return `${vorzeichen}${betrag.toLocaleString("de-DE", { maximumFractionDigits: 0 })} €`;
  return `${vorzeichen}${betrag.toLocaleString("de-DE", { maximumFractionDigits: 0 })}`;
}

/** Sparkline als Inline-SVG – einfarbige Fläche, kein Verlauf. */
function Sparkline({ werte, tone, gross }: { werte: number[]; tone: KpiCardProps["tone"]; gross?: boolean }) {
  const b = gross ? 96 : 72;
  const h = gross ? 28 : 24;
  if (werte.length < 2) return null;

  const min = Math.min(...werte);
  const max = Math.max(...werte);
  const spanne = max - min || 1;
  const punkte = werte.map((w, i) => {
    const x = (i / (werte.length - 1)) * (b - 2) + 1;
    const y = h - 3 - ((w - min) / spanne) * (h - 6);
    return [x, y] as const;
  });
  const linie = punkte.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const flaeche = `${linie} ${b - 1},${h} 1,${h}`;
  const letzter = punkte[punkte.length - 1];

  return (
    <svg width={b} height={h} viewBox={`0 0 ${b} ${h}`} aria-hidden="true" className="shrink-0">
      <polygon points={flaeche} className="fill-primary/10" />
      <polyline points={linie} fill="none" className={cn(strichfarbe[tone ?? "neutral"])} strokeWidth={1.5} />
      <circle cx={letzter[0]} cy={letzter[1]} r={2} className={cn(strichfarbe[tone ?? "neutral"], "fill-current")} />
    </svg>
  );
}

/** Innerhalb einer `KpiRow` rendert eine Kennzahl als Zelle ohne eigene Kante. */
const ImStreifen = React.createContext(false);

/**
 * Kennzahl v4: Label, große tabellarische Zahl (24 px), darunter Kontext
 * oder Veränderung als schlichter farbiger Text – keine Pille, kein Icon,
 * keine Kachel. In einer `KpiRow` stehen die Kennzahlen als EIN Streifen
 * mit Trennlinien; einzeln sind sie ein flacher Container mit Kante.
 *
 * Pflichtregel: Jede Geldsumme und jede nackte Zahl braucht `sub` ODER `delta`.
 */
export function KpiCard({
  label,
  value,
  sub,
  delta,
  trend,
  tone = "neutral",
  href,
  icon,
  akzent = "#2B59E6",
  size = "default",
  loading,
  className,
}: KpiCardProps) {
  const imStreifen = React.useContext(ImStreifen);
  const gross = size === "lg";
  const gut = delta ? (delta.invert ? delta.value < 0 : delta.value > 0) : null;
  const neutralesDelta = delta?.value === 0;

  const inhalt = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-13 font-medium text-foreground-secondary">{label}</p>
        {icon ? (
          <span
            aria-hidden="true"
            className="-my-1 hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:flex [&_svg]:h-4 [&_svg]:w-4"
            style={{ background: `${akzent}14`, color: akzent }}
          >
            {icon}
          </span>
        ) : href && (
          <ArrowUpRight
            className="h-3.5 w-3.5 shrink-0 text-foreground-tertiary opacity-0 transition-opacity group-hover:opacity-100"
            strokeWidth={1.75}
            aria-hidden="true"
          />
        )}
      </div>

      <div className="mt-1.5 flex items-end justify-between gap-3">
        {loading ? (
          <div className={cn("animate-soft-pulse rounded-md bg-muted", gross ? "h-9 w-28" : "h-8 w-24")} />
        ) : (
          <p
            className={cn(
              "truncate font-semibold tabular-nums",
              gross ? "text-kpi-lg" : "text-kpi",
              tone === "destructive" ? "text-destructive-text" : "text-foreground",
            )}
          >
            {value}
          </p>
        )}
        {trend && trend.length > 1 && <Sparkline werte={trend} tone={tone} gross={gross} />}
      </div>

      {(sub || delta) && (
        <p className="mt-1 flex min-w-0 items-center gap-1.5 truncate text-13 text-foreground-secondary">
          {delta && (
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-0.5 font-medium tabular-nums",
                neutralesDelta ? "text-foreground-secondary" : gut ? "text-success-text" : "text-destructive-text",
              )}
            >
              {!neutralesDelta &&
                (delta.value > 0 ? (
                  <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                ))}
              {formatDelta(delta)}
            </span>
          )}
          {delta?.label && <span className="truncate">{delta.label}</span>}
          {sub && (
            <span className={cn("truncate", tone === "warning" && "text-warning-text")}>
              {delta ? "· " : ""}
              {sub}
            </span>
          )}
        </p>
      )}
    </>
  );

  const klassen = cn(
    "group flex min-w-0 flex-col",
    imStreifen
      ? "px-5 py-4 shadow-[-1px_0_0_0_hsl(var(--border)),0_-1px_0_0_hsl(var(--border))]"
      : "rounded-xl bg-card p-4 shadow-panel print:shadow-none print:ring-1 print:ring-border",
    href && "transition-colors duration-fast ease-soft hover:bg-surface-muted",
    className,
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(klassen, "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring")}
      >
        {inhalt}
      </Link>
    );
  }

  return <div className={klassen}>{inhalt}</div>;
}

/**
 * Kennzahlen-Streifen: EIN Container mit Kante, die Kennzahlen darin durch
 * 1-px-Linien getrennt. Auf schmalen Bildschirmen zwei Spalten.
 */
export function KpiRow({
  children,
  cols,
  className,
}: {
  children: React.ReactNode;
  cols?: 3 | 4 | 6;
  className?: string;
}) {
  const anzahl = cols ?? React.Children.count(children);
  return (
    <ImStreifen.Provider value={true}>
      <div
        className={cn(
          "grid grid-cols-2 overflow-hidden rounded-xl bg-card shadow-panel print:shadow-none print:ring-1 print:ring-border",
          anzahl === 3 ? "lg:grid-cols-3" : anzahl >= 6 ? "lg:grid-cols-3 xl:grid-cols-6" : anzahl === 2 ? "" : "lg:grid-cols-4",
          className,
        )}
      >
        {children}
      </div>
    </ImStreifen.Provider>
  );
}
