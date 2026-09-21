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

/**
 * Kennzahl v3: Label, große tabellarische Zahl, Kontextzeile und optional
 * Delta-Pille plus Sparkline. Keine bunten Kacheln, kein Icon.
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
  size = "default",
  loading,
  className,
}: KpiCardProps) {
  const gross = size === "lg";
  const gut = delta ? (delta.invert ? delta.value < 0 : delta.value > 0) : null;
  const neutralesDelta = delta?.value === 0;

  const inhalt = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {delta && (
          <span
            className={cn(
              "inline-flex h-5 shrink-0 items-center gap-0.5 rounded-full px-1.5 text-xs font-medium tabular-nums",
              neutralesDelta
                ? "bg-surface-muted text-foreground-secondary"
                : gut
                  ? "bg-success-soft text-success-text"
                  : "bg-destructive-soft text-destructive-text",
            )}
          >
            {!neutralesDelta &&
              (delta.value > 0 ? (
                <ArrowUpRight className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
              ) : (
                <ArrowDownRight className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
              ))}
            {formatDelta(delta)}
          </span>
        )}
        {href && !delta && (
          <ArrowUpRight
            className="h-3.5 w-3.5 shrink-0 text-foreground-tertiary opacity-0 transition-opacity group-hover:opacity-100"
            strokeWidth={1.75}
            aria-hidden="true"
          />
        )}
      </div>

      {loading ? (
        <div className={cn("mt-1 animate-soft-pulse rounded-md bg-surface-muted", gross ? "h-8 w-28" : "h-7 w-24")} />
      ) : (
        <p
          className={cn(
            "mt-1 font-semibold tabular-nums",
            gross ? "text-kpi-lg" : "text-kpi",
            tone === "warning"
              ? "text-warning-text"
              : tone === "destructive"
                ? "text-destructive-text"
                : "text-foreground",
          )}
        >
          {value}
        </p>
      )}

      <div className="mt-auto flex items-end justify-between gap-3 pt-2">
        <p className="min-w-0 truncate text-xs text-muted-foreground">
          {sub}
          {delta?.label && <span className="ml-1 text-foreground-tertiary">{delta.label}</span>}
        </p>
        {trend && trend.length > 1 && <Sparkline werte={trend} tone={tone} gross={gross} />}
      </div>
    </>
  );

  const klassen = cn(
    "group flex flex-col rounded-xl bg-card p-4 shadow-panel print:shadow-none print:ring-1 print:ring-border",
    gross ? "min-h-[128px]" : "min-h-[104px]",
    href && "transition-shadow duration-fast ease-soft hover:shadow-md",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={cn(klassen, "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background")}>
        {inhalt}
      </Link>
    );
  }

  return <div className={klassen}>{inhalt}</div>;
}

/** KPI-Zeile – maximal vier Karten je Sichtbereich. */
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
    <div
      className={cn(
        "grid grid-cols-2 gap-4",
        anzahl === 3 ? "lg:grid-cols-3" : anzahl >= 6 ? "lg:grid-cols-3 xl:grid-cols-6" : "lg:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
