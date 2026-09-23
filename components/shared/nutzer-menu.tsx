"use client";

import Link from "next/link";
import { ChevronDown, LifeBuoy, LogOut, Settings, UserRound } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLLEN } from "@/lib/constants";
import { initialen } from "@/lib/utils";
import { abmelden } from "@/app/auth/actions";
import type { FahrlehrerRolle } from "@/lib/types";

/**
 * Nutzer oben rechts in der App-Leiste: Avatar mit Initialen, daneben Name
 * und Rolle (ab Tablet-Breite). Das Menü enthält Einstellungen, Hilfe und
 * Abmelden; die Abmelde-Logik (Server-Action `abmelden`) ist unverändert.
 */
export function NutzerMenu({
  vorname,
  nachname,
  rolle,
  email,
}: {
  vorname: string;
  nachname: string;
  rolle: FahrlehrerRolle;
  email: string | null;
}) {
  const istChef = rolle === "chef";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${vorname} ${nachname} · ${ROLLEN[rolle]} – Konto`}
        className="flex h-10 items-center gap-2.5 rounded-lg pl-1 pr-1.5 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/70 data-[state=open]:bg-muted xl:pr-2"
      >
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
        >
          {initialen(vorname, nachname)}
        </span>
        <span className="hidden min-w-0 text-left xl:block">
          <span className="block max-w-[140px] truncate text-13 font-semibold leading-4 text-foreground">
            {vorname} {nachname}
          </span>
          <span className="block max-w-[140px] truncate text-xs leading-4 text-foreground-tertiary">{ROLLEN[rolle]}</span>
        </span>
        <ChevronDown className="hidden h-3.5 w-3.5 shrink-0 text-foreground-tertiary xl:block" strokeWidth={1.75} aria-hidden="true" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={6} className="w-60">
        <DropdownMenuLabel className="text-foreground">
          <span className="block truncate text-13 font-medium">
            {vorname} {nachname}
          </span>
          <span className="block truncate text-xs font-normal text-muted-foreground">{email ?? ROLLEN[rolle]}</span>
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
