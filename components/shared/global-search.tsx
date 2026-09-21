"use client";

import { Search } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSidebar } from "@/components/shared/sidebar-context";
import { cn } from "@/lib/utils";
import type { FahrlehrerRolle } from "@/lib/types";

/**
 * Suche: Auslöser für die Kommandopalette – ein Button, kein Eingabefeld.
 * Sitzt mittig in der Kopfzeile (`feld`), auf schmalen Geräten als Lupe
 * rechts bei den Werkzeugen (`icon`). Die Palette selbst hängt einmal in
 * der Shell (`shell-overlays.tsx`).
 *
 * Das Tastaturkürzel funktioniert weiterhin, wird aber nicht angezeigt.
 */
export function GlobalSearch({
  variant = "feld",
  className,
}: {
  variant?: "feld" | "icon";
  /** Wird von der Palette in der Shell genutzt; hier nur zur API-Gleichheit. */
  rolle?: FahrlehrerRolle;
  className?: string;
}) {
  const { setPaletteOffen } = useSidebar();

  if (variant === "icon") {
    return (
      <Tooltip side="bottom" sideOffset={8}>
        <TooltipTrigger>
          <button
            type="button"
            onClick={() => setPaletteOffen(true)}
            aria-label="Suchen"
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors duration-fast",
              "hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
              className,
            )}
          >
            <Search className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Suchen</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPaletteOffen(true)}
      className={cn(
        "flex h-8 w-full items-center gap-2 rounded-md border border-border bg-card px-3 text-13 text-muted-foreground",
        "transition-colors duration-fast hover:border-border-hover hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
        className,
      )}
    >
      <Search className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
      <span className="truncate">Suchen …</span>
    </button>
  );
}
