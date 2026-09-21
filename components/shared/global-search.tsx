"use client";

import { Search } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSidebar } from "@/components/shared/sidebar-context";
import { cn } from "@/lib/utils";
import type { FahrlehrerRolle } from "@/lib/types";

/**
 * Suche v3: Auslöser für die Kommandopalette – ein Button, kein Eingabefeld.
 * Sitzt in der Kopfzeile der Seite, nicht in der Navigation. Die Palette
 * selbst hängt einmal in der Shell (`shell-overlays.tsx`).
 *
 * Ab `sm` ein Suchfeld-Knopf mit Kürzel, darunter nur das Lupen-Icon.
 */
export function GlobalSearch({
  className,
}: {
  /** Wird von der Palette in der Shell genutzt; hier nur zur API-Gleichheit. */
  rolle?: FahrlehrerRolle;
  className?: string;
}) {
  const { setPaletteOffen } = useSidebar();

  return (
    <>
      {/* Kompakt: nur Lupe */}
      <Tooltip side="bottom" sideOffset={8}>
        <TooltipTrigger>
          <button
            type="button"
            onClick={() => setPaletteOffen(true)}
            aria-label="Suchen"
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors duration-fast",
              "hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
              "sm:hidden",
              className,
            )}
          >
            <Search className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          Suchen
          <kbd className="kbd">⌘K</kbd>
        </TooltipContent>
      </Tooltip>

      {/* Ab sm: Suchfeld-Knopf */}
      <button
        type="button"
        onClick={() => setPaletteOffen(true)}
        className={cn(
          "hidden h-8 items-center gap-2 rounded-md border border-border bg-card px-2.5 text-13 text-muted-foreground",
          "transition-colors duration-fast hover:border-border-hover hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 sm:flex",
          "w-[168px] lg:w-[220px]",
          className,
        )}
      >
        <Search className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
        <span className="flex-1 text-left">Suchen …</span>
        <kbd className="kbd">⌘K</kbd>
      </button>
    </>
  );
}
