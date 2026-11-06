import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Weiße Karte mit Kopfzeile (Titel, Meta, Aktion rechts) – der Baustein für
 * Übersichten und Auswertungen auf der grauen Arbeitsfläche.
 */
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
