"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { aktiverBereich, bereicheFuer } from "@/components/shared/bereiche";
import { cn } from "@/lib/utils";
import type { FahrlehrerRolle } from "@/lib/types";

/**
 * Bereichs-Navigation: erste Ebene als Strip mit Türkis-Indikator, zweite
 * Ebene (Kontext) als schmale Zeile darunter – nur wenn der Bereich mehr
 * als einen Eintrag hat. Auf Mobil wird die Kontext-Zeile scrollbar.
 */
export function AreaNav({ rolle }: { rolle: FahrlehrerRolle }) {
  const pathname = usePathname();
  const bereiche = bereicheFuer(rolle);
  const { bereich: aktiv, item: aktivItem } = aktiverBereich(bereiche, pathname);

  return (
    <div className="border-b bg-card print:hidden">
      {/* Ebene 1 – Bereiche (Desktop) */}
      <nav aria-label="Bereiche" className="mx-auto hidden h-10 max-w-[1440px] items-stretch gap-6 px-5 md:flex lg:px-8">
        {bereiche.map((b) => {
          const a = aktiv?.key === b.key;
          const Icon = b.icon;
          return (
            <Link
              key={b.key}
              href={b.items[0].href}
              aria-current={a ? "page" : undefined}
              className={cn(
                "relative inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors duration-fast",
                "after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-transparent after:transition-colors after:duration-fast",
                a ? "text-foreground after:bg-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className={cn("h-[15px] w-[15px]", a ? "text-primary" : "text-muted-foreground")} strokeWidth={1.75} />
              {b.label}
            </Link>
          );
        })}
      </nav>

      {/* Ebene 2 – Kontext des aktiven Bereichs */}
      {aktiv && aktiv.items.length > 1 && (
        <nav
          aria-label={`${aktiv.label} – Unterbereiche`}
          className="mx-auto flex h-9 max-w-[1440px] items-center gap-1 overflow-x-auto px-3 [scrollbar-width:none] md:px-5 lg:px-8 [&::-webkit-scrollbar]:hidden"
        >
          {aktiv.items.map((i) => {
            const a = aktivItem?.href === i.href;
            return (
              <Link
                key={i.href}
                href={i.href}
                aria-current={a ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-fast",
                  a
                    ? "bg-foreground text-background"
                    : "text-foreground-secondary hover:bg-foreground/[0.06] hover:text-foreground",
                )}
              >
                {i.label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}

/** Mobile Bottom-Bar mit den Bereichen. */
export function MobileAreaBar({ rolle }: { rolle: FahrlehrerRolle }) {
  const pathname = usePathname();
  const bereiche = bereicheFuer(rolle);
  const { bereich: aktiv } = aktiverBereich(bereiche, pathname);

  return (
    <nav
      aria-label="Bereiche"
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden print:hidden"
    >
      {bereiche.slice(0, 5).map((b) => {
        const a = aktiv?.key === b.key;
        const Icon = b.icon;
        return (
          <Link
            key={b.key}
            href={b.items[0].href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
              a ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={a ? 2.2 : 1.75} />
            {b.label}
          </Link>
        );
      })}
    </nav>
  );
}
