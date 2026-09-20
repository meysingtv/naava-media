"use client";

import Link from "next/link";
import { CalendarPlus, ChevronDown, FilePlus2, ListPlus, Plus, UserPlus, type LucideIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { bereicheFuer } from "@/components/shared/bereiche";
import { useSidebar } from "@/components/shared/sidebar-context";
import { cn } from "@/lib/utils";
import type { FahrlehrerRolle } from "@/lib/types";

/** Die vier Einträge aus der alten Top-Bar – unverändert in Ziel und Reihenfolge. */
const EINTRAEGE: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/schueler/neu", label: "Schüler anlegen", icon: UserPlus },
  { href: "/kalender", label: "Termin planen", icon: CalendarPlus },
  { href: "/rechnungen/neu", label: "Rechnung erstellen", icon: FilePlus2 },
  { href: "/aufgaben", label: "Aufgabe erfassen", icon: ListPlus },
];

/**
 * „+ Neu" im Sidebar-Fuß. Ein Eintrag erscheint nur, wenn sein Ziel in
 * `bereicheFuer(rolle)` vorkommt – die Rollenregeln bleiben die einzige
 * Quelle der Sichtbarkeit.
 */
export function NeuMenu({ rolle, imDrawer }: { rolle: FahrlehrerRolle; imDrawer?: boolean }) {
  const { collapsed } = useSidebar();
  const eingeklappt = collapsed && !imDrawer;

  const erlaubt = new Set(bereicheFuer(rolle).flatMap((b) => b.items.map((i) => i.href)));
  const sichtbar = EINTRAEGE.filter((e) => erlaubt.has(e.href) || erlaubt.has(e.href.replace(/\/neu$/, "")));

  if (sichtbar.length === 0) return null;

  const trigger = (
    <DropdownMenuTrigger
      aria-label={eingeklappt ? "Neu" : undefined}
      className={cn(
        "flex items-center rounded-md bg-primary text-13 font-semibold text-primary-foreground outline-none transition-colors duration-fast",
        "hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-bar/70",
        eingeklappt ? "mx-auto h-10 w-10 justify-center" : "h-9 w-full gap-2 px-3",
      )}
    >
      <Plus className="h-[15px] w-[15px] shrink-0" strokeWidth={2} aria-hidden="true" />
      {!eingeklappt && (
        <>
          <span className="flex-1 text-left">Neu</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" strokeWidth={1.75} aria-hidden="true" />
        </>
      )}
    </DropdownMenuTrigger>
  );

  return (
    <DropdownMenu>
      {eingeklappt ? (
        <Tooltip side="right" sideOffset={10}>
          <TooltipTrigger>{trigger}</TooltipTrigger>
          <TooltipContent>Neu</TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}
      <DropdownMenuContent side="top" align="start" sideOffset={6} className="w-56">
        {sichtbar.map((e) => (
          <DropdownMenuItem key={e.href} asChild>
            <Link href={e.href} className="cursor-pointer">
              <e.icon /> {e.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
