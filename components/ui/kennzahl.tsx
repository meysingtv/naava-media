import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

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
