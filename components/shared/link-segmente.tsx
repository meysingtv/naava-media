import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Segmente als Links – für Zeiträume und Ansichten, die eine eigene Adresse
 * haben. Gleiche Optik wie die Segmente über den Listen: weiße Schiene,
 * aktives Segment hellblau.
 */
export function LinkSegmente({
  optionen,
  aktiv,
  label,
  className,
}: {
  optionen: { key: string; label: string; href: string }[];
  aktiv: string;
  label: string;
  className?: string;
}) {
  return (
    <nav
      aria-label={label}
      className={cn(
        "inline-flex h-8 max-w-full shrink-0 items-center gap-0.5 overflow-x-auto rounded-lg bg-card p-0.5 shadow-panel [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {optionen.map((o) => {
        const istAktiv = o.key === aktiv;
        return (
          <Link
            key={o.key}
            href={o.href}
            scroll={false}
            aria-current={istAktiv ? "page" : undefined}
            className={cn(
              "inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-[5px] px-2.5 text-13 font-medium transition-colors duration-fast",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70",
              istAktiv ? "bg-primary-soft text-primary-text" : "text-foreground-secondary hover:bg-muted hover:text-foreground",
            )}
          >
            {o.label}
          </Link>
        );
      })}
    </nav>
  );
}
