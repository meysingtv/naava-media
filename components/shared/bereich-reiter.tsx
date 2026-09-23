"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { bereicheFuer, bereichsReiter } from "@/components/shared/bereiche";
import { useSidebarOptional } from "@/components/shared/sidebar-context";
import { cn } from "@/lib/utils";

function useBereichsReiter() {
  const pathname = usePathname();
  const kontext = useSidebarOptional();
  const rolle = kontext?.rolle;
  return React.useMemo(
    () => (rolle ? bereichsReiter(bereicheFuer(rolle), pathname) : null),
    [rolle, pathname],
  );
}

/**
 * Titelblock des Seitenkopfs. Auf der Startseite eines Bereichs mit mehreren
 * Seiten (Finanzen, Ausbildung, Team …) ist der Titel der BEREICH und die
 * einzelnen Seiten stehen als Reiter darunter – wie bei Stripe oder Linear.
 * Sonst: Brotkrumen, Seitentitel, kurze Meta-Angabe.
 */
export function SeitenTitel({
  title,
  description,
  stufen,
}: {
  title: string;
  description?: string;
  stufen: { label: string; href?: string }[];
}) {
  const reiter = useBereichsReiter();

  if (reiter) {
    return (
      <h1 className="truncate text-title font-semibold text-foreground">{reiter.bereich.label}</h1>
    );
  }

  return (
    <div className="min-w-0">
      {stufen.length > 0 && (
        <nav aria-label="Brotkrumen" className="mb-0.5 flex min-w-0 items-center gap-1">
          {stufen.map((s, i) => (
            <React.Fragment key={`${s.label}-${i}`}>
              {i > 0 && (
                <ChevronRight
                  className="h-3.5 w-3.5 shrink-0 text-foreground-tertiary"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              )}
              {s.href ? (
                <Link
                  href={s.href}
                  className="truncate text-13 text-foreground-secondary transition-colors hover:text-foreground"
                >
                  {s.label}
                </Link>
              ) : (
                <span className="truncate text-13 text-foreground-secondary">{s.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      <h1 className="truncate text-title font-semibold text-foreground">{title}</h1>
      {description && <p className="mt-0.5 text-sm text-foreground-secondary sm:truncate">{description}</p>}
    </div>
  );
}

/** Reiterleiste unter dem Titel – nur auf Bereichs-Startseiten mit mehreren Seiten. */
export function BereichReiterLeiste() {
  const reiter = useBereichsReiter();
  if (!reiter) return null;

  return (
    <nav
      aria-label={`${reiter.bereich.label} – Seiten`}
      className="mt-4 flex h-10 items-end gap-6 overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {reiter.bereich.items.map((i) => {
        const aktiv = i.href === reiter.aktiv.href;
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={aktiv ? "page" : undefined}
            className={cn(
              "relative -mb-px inline-flex h-10 shrink-0 items-center whitespace-nowrap px-0.5 text-sm font-medium transition-colors",
              "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-transparent",
              aktiv
                ? "text-foreground after:bg-foreground"
                : "text-foreground-secondary hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70",
            )}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
