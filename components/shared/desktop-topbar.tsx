"use client";

import Link from "next/link";
import { Bell, ChevronDown, LogOut, Settings } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GlobalSearch } from "@/components/shared/global-search";
import { ROLLEN } from "@/lib/constants";
import { initialen } from "@/lib/utils";
import { abmelden } from "@/app/auth/actions";
import type { FahrlehrerRolle } from "@/lib/types";

interface DesktopTopbarProps {
  fahrschuleName: string;
  ort: string | null;
  logoUrl: string | null;
  vorname: string;
  nachname: string;
  rolle: FahrlehrerRolle;
  email: string | null;
}

export function DesktopTopbar({
  fahrschuleName,
  ort,
  logoUrl,
  vorname,
  nachname,
  rolle,
  email,
}: DesktopTopbarProps) {
  const istChef = rolle === "chef";

  return (
    <header className="sticky top-0 z-30 hidden h-16 items-center gap-4 border-b bg-card pl-6 pr-4 md:flex print:hidden">
      {/* Links: Logo + Fahrschulname + Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex shrink-0 items-center gap-2.5 rounded-lg py-1 pr-1 outline-none ring-offset-background transition-colors focus-visible:ring-2 focus-visible:ring-ring">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={fahrschuleName} className="h-full w-full rounded-full object-cover" />
            ) : (
              <span className="text-base font-bold text-primary">{initialen(fahrschuleName, "")}</span>
            )}
          </span>
          <span className="hidden text-left leading-tight sm:block">
            <span className="block max-w-[180px] truncate text-sm font-semibold text-foreground">
              {fahrschuleName}
            </span>
            {ort && <span className="block text-xs text-muted-foreground">{ort}</span>}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>
            <p className="font-semibold">{fahrschuleName}</p>
            {ort && <p className="text-xs font-normal text-muted-foreground">{ort}</p>}
          </DropdownMenuLabel>
          {istChef && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/einstellungen" className="cursor-pointer">
                  <Settings className="h-4 w-4" /> Einstellungen
                </Link>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Mitte: KI-Suche */}
      <div className="flex flex-1 justify-center">
        <div className="w-full max-w-xl">
          <GlobalSearch />
        </div>
      </div>

      {/* Rechts: Glocke + Profil */}
      <div className="flex shrink-0 items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Benachrichtigungen"
            className="mr-2 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground outline-none ring-offset-background transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Bell className="h-5 w-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Benachrichtigungen</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              Keine neuen Benachrichtigungen.
            </p>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 outline-none ring-offset-background transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {initialen(vorname, nachname)}
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-sm font-medium text-foreground">
                {vorname} {nachname}
              </span>
              <span className="block text-xs text-muted-foreground">{ROLLEN[rolle]}</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="font-semibold">
                {vorname} {nachname}
              </p>
              <p className="truncate text-xs font-normal text-muted-foreground">{email ?? ROLLEN[rolle]}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {istChef && (
              <DropdownMenuItem asChild>
                <Link href="/einstellungen" className="cursor-pointer">
                  <Settings className="h-4 w-4" /> Einstellungen
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <form action={abmelden}>
              <button
                type="submit"
                className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive outline-none transition-colors hover:bg-accent"
              >
                <LogOut className="h-4 w-4" />
                Abmelden
              </button>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
