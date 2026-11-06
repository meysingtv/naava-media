"use client";

import Link from "next/link";
import { ChevronsUpDown, LifeBuoy, LogOut, Settings, UserRound } from "lucide-react";

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

function Avatar({ vorname, nachname }: { vorname: string; nachname: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
    >
      {initialen(vorname, nachname)}
    </span>
  );
}

/**
 * Konto unten in der Navigation: Avatar, Name und Rolle; das Menü öffnet
 * nach rechts (im Drawer nach oben) und enthält Einstellungen, Team, Hilfe
 * und Abmelden. Die Abmelde-Logik (Server-Action `abmelden`) ist unverändert.
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
  const name = `${vorname} ${nachname}`;

  const trigger = (
    <DropdownMenuTrigger
      aria-label={`${name} · ${ROLLEN[rolle]} – Konto`}
      className={cn(
        "flex items-center rounded-lg text-left outline-none transition-colors duration-fast",
        "hover:bg-sidebar-hover data-[state=open]:bg-sidebar-hover",
        "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70",
        eingeklappt ? "mx-auto h-10 w-10 justify-center" : "h-12 w-full gap-2.5 pl-1.5 pr-2",
      )}
    >
      <Avatar vorname={vorname} nachname={nachname} />
      {!eingeklappt && (
        <>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold leading-5 text-foreground">{name}</span>
            <span className="block truncate text-xs leading-4 text-foreground-tertiary">{ROLLEN[rolle]}</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-sidebar-muted" strokeWidth={1.75} aria-hidden="true" />
        </>
      )}
    </DropdownMenuTrigger>
  );

  return (
    <DropdownMenu>
      {eingeklappt ? (
        <Tooltip side="right" sideOffset={10}>
          <TooltipTrigger>{trigger}</TooltipTrigger>
          <TooltipContent>{name}</TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}

      <DropdownMenuContent side={imDrawer ? "top" : "right"} align="end" sideOffset={imDrawer ? 6 : 12} className="w-60">
        <DropdownMenuLabel className="flex items-center gap-2.5 text-foreground">
          <Avatar vorname={vorname} nachname={nachname} />
          <span className="min-w-0">
            <span className="block truncate text-13 font-semibold">{name}</span>
            <span className="block truncate text-xs font-normal text-muted-foreground">{email ?? ROLLEN[rolle]}</span>
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
        {istChef && (
          <DropdownMenuItem asChild>
            <Link href="/fahrlehrer" className="cursor-pointer">
              <UserRound /> Team verwalten
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
