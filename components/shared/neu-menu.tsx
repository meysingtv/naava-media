"use client";

import Link from "next/link";
import { CalendarPlus, ChevronDown, FilePlus2, ListPlus, Plus, UserPlus, type LucideIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
 * „Neu" in der Kopfzeile der Seite – bewusst neutral gehalten, damit es
 * nicht mit der grünen Primäraktion der jeweiligen Seite konkurriert.
 *
 * Ein Eintrag erscheint nur, wenn sein Ziel in `bereicheFuer(rolle)`
 * vorkommt – die Rollenregeln bleiben die einzige Quelle der Sichtbarkeit.
 */
export function NeuMenu({ rolle: rolleProp, className }: { rolle?: FahrlehrerRolle; className?: string }) {
  const { rolle: rolleKontext } = useSidebar();
  const rolle = rolleProp ?? rolleKontext;

  const erlaubt = new Set(bereicheFuer(rolle).flatMap((b) => b.items.map((i) => i.href)));
  const sichtbar = EINTRAEGE.filter((e) => erlaubt.has(e.href) || erlaubt.has(e.href.replace(/\/neu$/, "")));

  if (sichtbar.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Neu anlegen"
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-md border border-border-strong bg-card px-2.5 text-13 font-medium text-foreground shadow-xs",
          "outline-none transition-colors duration-fast hover:bg-surface-muted",
          "data-[state=open]:bg-muted",
          "focus-visible:ring-2 focus-visible:ring-ring/70",
          className,
        )}
      >
        <Plus className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
        <span className="hidden sm:inline">Neu</span>
        <ChevronDown
          className="hidden h-3.5 w-3.5 shrink-0 text-muted-foreground sm:inline"
          strokeWidth={1.75}
          aria-hidden="true"
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={6} className="w-56">
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
