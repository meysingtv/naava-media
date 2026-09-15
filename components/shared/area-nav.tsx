"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { aktiverBereich, bereicheFuer } from "@/components/shared/bereiche";
import { cn } from "@/lib/utils";
import type { FahrlehrerRolle } from "@/lib/types";

/**
 * Bereichs-Navigation v3.
 *
 * Ebene 1 (Desktop): die sechs Arbeitsbereiche als Reihe. Der aktive Bereich
 * bekommt sein Icon in einem gefüllten Mint-Quadrat („Du bist hier") plus
 * eine feine Mint-Linie – ein markanter, ruhiger Anker statt eines schwarzen
 * Buttons.
 *
 * Ebene 2 (Kontext): keine schwebenden Chips mehr, sondern eine leicht
 * eingelassene Unter-Leiste (Off-White) mit dezenten Reiter-Links. So liest
 * sie sich sichtbar als „gehört zum aktiven Bereich" und hebt sich in Gewicht
 * klar von Ebene 1 ab. Auf Mobil bleibt sie scrollbar.
 */
export function AreaNav({ rolle }: { rolle: FahrlehrerRolle }) {
  const pathname = usePathname();
  const bereiche = bereicheFuer(rolle);
  const { bereich: aktiv, item: aktivItem } = aktiverBereich(bereiche, pathname);
  const hatKontext = Boolean(aktiv && aktiv.items.length > 1);

  return (
    <div className="bg-card print:hidden">
      {/* Ebene 1 – Bereiche (nur Desktop; Mobil übernimmt die Bottom-Bar) */}
      <div className={cn("hidden md:block", !hatKontext && "border-b")}>
        <nav
          aria-label="Bereiche"
          className="mx-auto flex h-12 max-w-[1440px] items-stretch gap-0.5 px-3 md:px-5 lg:px-8"
        >
          {bereiche.map((b) => {
            const a = aktiv?.key === b.key;
            const Icon = b.icon;
            return (
              <Link
                key={b.key}
                href={b.items[0].href}
                aria-current={a ? "page" : undefined}
                className={cn(
                  "group relative inline-flex items-center gap-2 px-2 text-[13px] font-medium transition-colors duration-fast",
                  "after:absolute after:inset-x-2 after:-bottom-px after:h-[2px] after:rounded-full after:transition-colors after:duration-fast",
                  a
                    ? "text-foreground after:bg-primary"
                    : "text-muted-foreground after:bg-transparent hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors duration-fast",
                    a ? "bg-primary text-primary-foreground" : "text-muted-foreground group-hover:text-foreground",
                  )}
                >
                  <Icon className="h-[15px] w-[15px]" strokeWidth={a ? 2 : 1.75} />
                </span>
                {b.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Ebene 2 – Kontext des aktiven Bereichs (eingelassene Reiter-Leiste) */}
      {hatKontext && aktiv && (
        <div className="border-b bg-surface-muted">
          <nav
            aria-label={`${aktiv.label} – Unterbereiche`}
            className="mx-auto flex h-10 max-w-[1440px] items-stretch gap-1 overflow-x-auto px-3 [scrollbar-width:none] md:px-5 lg:px-8 [&::-webkit-scrollbar]:hidden"
          >
            {aktiv.items.map((i) => {
              const a = aktivItem?.href === i.href;
              return (
                <Link
                  key={i.href}
                  href={i.href}
                  aria-current={a ? "page" : undefined}
                  className={cn(
                    "relative inline-flex shrink-0 items-center px-2 text-[12.5px] transition-colors duration-fast",
                    "after:absolute after:inset-x-2 after:bottom-0 after:h-[2px] after:rounded-t-full after:transition-colors after:duration-fast",
                    a
                      ? "font-semibold text-primary after:bg-primary"
                      : "font-medium text-foreground-secondary after:bg-transparent hover:text-foreground",
                  )}
                >
                  {i.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}

/** Mobile Bottom-Bar mit den Bereichen – aktive Kachel mit Mint-Pille. */
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
            aria-current={a ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 pb-1.5 pt-2 text-[10px] font-medium transition-colors duration-fast",
              a ? "text-primary" : "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "flex h-6 w-11 items-center justify-center rounded-full transition-colors duration-fast",
                a ? "bg-primary-soft" : "bg-transparent",
              )}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={a ? 2.2 : 1.75} />
            </span>
            {b.label}
          </Link>
        );
      })}
    </nav>
  );
}
