"use client";

import Link from "next/link";
import { Bell, Check, ChevronsUpDown, LogOut, Settings } from "lucide-react";

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
import { fahrschuleWechseln } from "@/app/(dashboard)/fahrschul-actions";
import type { FahrlehrerRolle, FahrschulMitgliedschaft } from "@/lib/types";

interface DesktopTopbarProps {
  fahrschuleName: string;
  ort: string | null;
  logoUrl: string | null;
  vorname: string;
  nachname: string;
  rolle: FahrlehrerRolle;
  email: string | null;
  fahrschulen: FahrschulMitgliedschaft[];
  aktiveFahrschuleId: string | null;
}

const triggerBase =
  "flex items-center gap-2 rounded-md outline-none transition-colors duration-fast ease-soft hover:bg-surface focus-visible:ring-[3px] focus-visible:ring-primary/25 data-[state=open]:bg-surface";

export function DesktopTopbar({
  fahrschuleName,
  ort,
  logoUrl,
  vorname,
  nachname,
  rolle,
  email,
  fahrschulen,
  aktiveFahrschuleId,
}: DesktopTopbarProps) {
  const istChef = rolle === "chef";
  const mehrereFahrschulen = fahrschulen.length > 1;

  return (
    <header className="sticky top-0 z-30 hidden h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur-none md:flex print:hidden">
      {/* Links: Fahrschule (Workspace-Umschalter) */}
      <DropdownMenu>
        <DropdownMenuTrigger className={`${triggerBase} h-9 w-[216px] shrink-0 pl-1.5 pr-2`}>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary text-xs font-semibold text-primary-foreground">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={fahrschuleName} className="h-full w-full object-cover" />
            ) : (
              initialen(fahrschuleName, "")
            )}
          </span>
          <span className="min-w-0 flex-1 text-left leading-tight">
            <span className="block truncate text-sm font-medium text-foreground">
              {fahrschuleName}
            </span>
            {ort && <span className="block truncate text-2xs text-muted-foreground">{ort}</span>}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>
            <p className="font-medium">{fahrschuleName}</p>
            {ort && <p className="text-xs font-normal text-muted-foreground">{ort}</p>}
          </DropdownMenuLabel>

          {mehrereFahrschulen && (
            <>
              <DropdownMenuSeparator />
              <p className="px-2 pb-1 pt-1.5 text-2xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Fahrschule wechseln
              </p>
              {fahrschulen.map((f) => (
                <form key={f.id} action={fahrschuleWechseln}>
                  <input type="hidden" name="id" value={f.id} />
                  <button
                    type="submit"
                    className="flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-sm px-2 text-sm outline-none transition-colors duration-fast hover:bg-surface focus-visible:bg-surface"
                  >
                    <span className="truncate">{f.name}</span>
                    {f.id === aktiveFahrschuleId && (
                      <Check className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
                    )}
                  </button>
                </form>
              ))}
            </>
          )}

          {istChef && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/einstellungen" className="cursor-pointer">
                  <Settings /> Einstellungen
                </Link>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Mitte: Suche */}
      <div className="flex flex-1 justify-center">
        <div className="w-full max-w-md">
          <GlobalSearch />
        </div>
      </div>

      {/* Rechts: Benachrichtigungen + Profil */}
      <div className="flex shrink-0 items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Benachrichtigungen"
            className={`${triggerBase} h-9 w-9 justify-center text-muted-foreground hover:text-foreground`}
          >
            <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Benachrichtigungen</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">
              Keine neuen Benachrichtigungen.
            </p>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger className={`${triggerBase} h-9 pl-1.5 pr-2`}>
            <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-primary-soft-strong text-2xs font-semibold text-primary-pressed">
              {initialen(vorname, nachname)}
            </span>
            <span className="hidden text-left leading-tight lg:block">
              <span className="block text-sm font-medium text-foreground">
                {vorname} {nachname}
              </span>
              <span className="block text-2xs text-muted-foreground">{ROLLEN[rolle]}</span>
            </span>
            <ChevronsUpDown className="hidden h-3.5 w-3.5 shrink-0 text-muted-foreground lg:block" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>
              <p className="font-medium">
                {vorname} {nachname}
              </p>
              <p className="truncate text-xs font-normal text-muted-foreground">
                {email ?? ROLLEN[rolle]}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {istChef && (
              <DropdownMenuItem asChild>
                <Link href="/einstellungen" className="cursor-pointer">
                  <Settings /> Einstellungen
                </Link>
              </DropdownMenuItem>
            )}
            <form action={abmelden}>
              <button
                type="submit"
                className="relative flex h-9 w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 text-sm text-destructive outline-none transition-colors duration-fast hover:bg-destructive-soft focus-visible:bg-destructive-soft"
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
