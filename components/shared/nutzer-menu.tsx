"use client";

import Link from "next/link";
import { ChevronsUpDown, LifeBuoy, LogOut, Settings } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSidebar } from "@/components/shared/sidebar-context";
import { ROLLEN } from "@/lib/constants";
import { cn, initialen } from "@/lib/utils";
import { abmelden } from "@/app/auth/actions";
import type { FahrlehrerRolle } from "@/lib/types";

/**
 * Nutzer im Sidebar-Fuß: Avatar mit Initialen, Name und Rolle. Die
 * Abmelde-Logik (Server-Action `abmelden`) ist unverändert aus der alten
 * Top-Bar übernommen.
 */
export function NutzerMenu({
  vorname,
  nachname,
  rolle,
  email,
  imDrawer,
}: {
  vorname: string;
  nachname: string;
  rolle: FahrlehrerRolle;
  email: string | null;
  imDrawer?: boolean;
}) {
  const { collapsed } = useSidebar();
  const eingeklappt = collapsed && !imDrawer;
  const istChef = rolle === "chef";

  const avatar = (
    <span
      aria-hidden="true"
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground-secondary"
    >
      {initialen(vorname, nachname)}
    </span>
  );

  const trigger = (
    <DropdownMenuTrigger
      aria-label={eingeklappt ? `${vorname} ${nachname} · ${ROLLEN[rolle]}` : undefined}
      className={cn(
        "flex items-center rounded-md outline-none transition-colors duration-fast",
        "hover:bg-sidebar-hover data-[state=open]:bg-sidebar-hover",
        "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70",
        eingeklappt ? "mx-auto h-9 w-9 justify-center" : "h-10 w-full gap-2.5 px-2",
      )}
    >
      {avatar}
      {!eingeklappt && (
        <>
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate text-13 font-medium text-foreground">
              {vorname} {nachname}
            </span>
            <span className="block truncate text-xs text-foreground-tertiary">{ROLLEN[rolle]}</span>
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-sidebar-muted" strokeWidth={1.75} aria-hidden="true" />
        </>
      )}
    </DropdownMenuTrigger>
  );

  return (
    <DropdownMenu>
      {eingeklappt ? (
        <Tooltip side="right" sideOffset={10}>
          <TooltipTrigger>{trigger}</TooltipTrigger>
          <TooltipContent>{`${vorname} ${nachname}`}</TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}

      <DropdownMenuContent side="top" align="start" sideOffset={6} className="w-60">
        <DropdownMenuLabel className="text-foreground">
          <span className="block truncate text-13 font-medium">
            {vorname} {nachname}
          </span>
          <span className="block truncate text-xs font-normal text-muted-foreground">
            {email ?? ROLLEN[rolle]}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {istChef && (
          <DropdownMenuItem asChild>
            <Link href="/einstellungen" className="cursor-pointer">
              <Settings /> Einstellungen
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href="/hilfe" className="cursor-pointer">
            <LifeBuoy /> Hilfe
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={abmelden}>
          <button
            type="submit"
            className="relative flex h-8 w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 text-13 text-destructive-text outline-none transition-colors hover:bg-destructive-soft focus-visible:bg-destructive-soft [&_svg]:size-4 [&_svg]:text-destructive"
          >
            <LogOut strokeWidth={1.75} />
            Abmelden
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
