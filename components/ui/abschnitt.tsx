import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Abschnitt v4: Überschrift (14/600) mit optionaler Meta-Angabe und einer
 * Aktion rechts, darunter der Inhalt. Mit `rahmen` sitzt der Inhalt in einem
 * weißen Container mit 1-px-Kante – ohne Schatten, ohne graue Fläche.
 */
export function Abschnitt({
  titel,
  meta,
  aktion,
  rahmen,
  children,
  className,
  inhaltClassName,
  id,
}: {
  titel?: React.ReactNode;
  /** Kurze Zusatzangabe neben dem Titel („3 offen"). */
  meta?: React.ReactNode;
  /** Rechts in der Titelzeile: Link oder kleiner Knopf. */
  aktion?: React.ReactNode;
  rahmen?: boolean;
  children: React.ReactNode;
  className?: string;
  inhaltClassName?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("min-w-0", className)}>
      {(titel || aktion) && (
        <div className="mb-3 flex min-h-7 items-center justify-between gap-3">
          <div className="flex min-w-0 items-baseline gap-2">
            {titel && <h2 className="truncate text-sm font-semibold text-foreground">{titel}</h2>}
            {meta && <span className="truncate text-13 text-foreground-tertiary">{meta}</span>}
          </div>
          {aktion && <div className="flex shrink-0 items-center gap-2">{aktion}</div>}
        </div>
      )}
      {rahmen ? (
        <div className={cn("overflow-hidden rounded-xl bg-card shadow-panel", inhaltClassName)}>{children}</div>
      ) : (
        <div className={inhaltClassName}>{children}</div>
      )}
    </section>
  );
}

/** Dezenter Textlink rechts in einer Abschnittszeile („Alle anzeigen"). */
export function AbschnittLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-13 font-medium text-foreground-secondary transition-colors hover:text-foreground"
    >
      {children}
    </Link>
  );
}

/** Leerer Hinweis innerhalb eines gerahmten Abschnitts – ein Satz, zentriert. */
export function AbschnittLeer({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-8 text-center text-13 text-foreground-secondary">{children}</p>;
}
