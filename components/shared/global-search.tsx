"use client";

import { Search } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSidebar } from "@/components/shared/sidebar-context";
import { cn } from "@/lib/utils";
import type { FahrlehrerRolle } from "@/lib/types";

/**
 * Suche v3: Auslöser für die Kommandopalette – ein Button, kein Eingabefeld.
 * Die Palette selbst hängt einmal in der Shell (`shell-overlays.tsx`), damit
 * Sidebar und Mobil-Drawer sie sich teilen; die Such- und KI-Logik liegt in
 * `command-palette.tsx`.
 */
export function GlobalSearch({
  variant = "sidebar",
  collapsed,
  className,
}: {
  variant?: "sidebar" | "icon";
  collapsed?: boolean;
  /** Wird von der Palette in der Shell genutzt; hier nur zur API-Gleichheit. */
  rolle?: FahrlehrerRolle;
  className?: string;
}) {
  const { setPaletteOffen } = useSidebar();
  const eingeklappt = collapsed || variant === "icon";

  const knopf = (
    <button
      type="button"
      onClick={() => setPaletteOffen(true)}
      aria-label={eingeklappt ? "Suchen · ⌘K" : undefined}
      className={cn(
        "flex items-center rounded-md bg-sidebar-hover text-13 text-sidebar-muted ring-1 ring-inset ring-sidebar-border transition-colors duration-fast",
        "hover:ring-sidebar-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-bar/70",
        eingeklappt ? "mx-auto mt-3 h-10 w-10 justify-center" : "mx-3 mt-3 h-9 gap-2 px-2.5",
        className,
      )}
    >
      <Search className="h-[15px] w-[15px] shrink-0" strokeWidth={1.75} aria-hidden="true" />
      {!eingeklappt && (
        <>
          <span className="flex-1 text-left">Suchen …</span>
          <kbd className="kbd">⌘K</kbd>
        </>
      )}
    </button>
  );

  if (!eingeklappt) return knopf;

  return (
    <Tooltip side="right" sideOffset={10}>
      <TooltipTrigger>{knopf}</TooltipTrigger>
      <TooltipContent>
        Suchen
        <kbd className="kbd">⌘K</kbd>
      </TooltipContent>
    </Tooltip>
  );
}
