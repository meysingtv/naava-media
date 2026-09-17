"use client";

import Link from "next/link";
import {
  CalendarPlus,
  Check,
  ChevronDown,
  FilePlus2,
  HelpCircle,
  ListPlus,
  LogOut,
  Plus,
  Settings,
  UserPlus,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GlobalSearch } from "@/components/shared/global-search";
import { AssistentWidget } from "@/components/shared/assistent-widget";
import { Logo } from "@/components/shared/logo";
import { ROLLEN } from "@/lib/constants";
import { cn, initialen } from "@/lib/utils";
import { abmelden } from "@/app/auth/actions";
import { fahrschuleWechseln } from "@/app/(dashboard)/fahrschul-actions";
import type { FahrlehrerRolle, FahrschulMitgliedschaft } from "@/lib/types";

interface TopBarProps {
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

const trigger =
  "inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-foreground outline-none transition-colors duration-fast hover:bg-foreground/[0.06] focus-visible:ring-2 focus-visible:ring-primary/35 data-[state=open]:bg-foreground/[0.06]";

export function TopBar({
  fahrschuleName,
  ort,
  logoUrl,
  vorname,
  nachname,
  rolle,
  email,
  fahrschulen,
  aktiveFahrschuleId,
}: TopBarProps) {
  const istChef = rolle === "chef";
  const mehrere = fahrschulen.length > 1;

  return (
    <header className="sticky top-0 z-40 border-b bg-card print:hidden">
      <div className="mx-auto flex h-12 max-w-[1440px] items-center gap-3 px-3 md:px-5 lg:px-8">
        {/* Marke + Arbeitsbereich */}
        <div className="flex min-w-0 items-center gap-2">
          <Link href="/dashboard" aria-label="Zum Leitstand" className="shrink-0">
            <Logo compact className="md:hidden" />
            <Logo className="hidden md:inline-flex" />
          </Link>
          <span className="hidden h-4 w-px bg-border md:block" />
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(trigger, "hidden min-w-0 md:inline-flex")}>
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="h-5 w-5 rounded-[4px] object-cover" />
              ) : null}
              <span className="max-w-[200px] truncate">{fahrschuleName}</span>
              {ort && <span className="hidden truncate text-muted-foreground lg:inline">· {ort}</span>}
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>
                <p className="font-medium">{fahrschuleName}</p>
                {ort && <p className="text-xs font-normal text-muted-foreground">{ort}</p>}
              </DropdownMenuLabel>
              {mehrere && (
                <>
                  <DropdownMenuSeparator />
                  <p className="label-caps px-2 pb-1 pt-1.5">Fahrschule wechseln</p>
                  {fahrschulen.map((f) => (
                    <form key={f.id} action={fahrschuleWechseln}>
                      <input type="hidden" name="id" value={f.id} />
                      <button
                        type="submit"
                        className="flex h-8 w-full cursor-pointer items-center justify-between gap-2 rounded-[4px] px-2 text-[13px] outline-none transition-colors hover:bg-surface-muted"
                      >
                        <span className="truncate">{f.name}</span>
                        {f.id === aktiveFahrschuleId && <Check className="h-4 w-4 text-primary" strokeWidth={2.5} />}
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
        </div>

        {/* Suche / Befehle */}
        <div className="flex min-w-0 flex-1 justify-center">
          <div className="w-full max-w-[520px]">
            <GlobalSearch />
          </div>
        </div>

        {/* Aktionen */}
        <div className="flex shrink-0 items-center gap-1">
          <AssistentWidget />
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-8 items-center gap-1 rounded-md bg-primary pl-2.5 pr-2 text-[13px] font-medium text-primary-foreground outline-none transition-colors duration-fast hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-1">
              <Plus className="h-[15px] w-[15px]" strokeWidth={2.25} />
              <span className="hidden sm:inline">Neu</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-80" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link href="/schueler/neu" className="cursor-pointer">
                  <UserPlus /> Schüler anlegen
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/kalender" className="cursor-pointer">
                  <CalendarPlus /> Termin planen
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/rechnungen/neu" className="cursor-pointer">
                  <FilePlus2 /> Rechnung erstellen
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/aufgaben" className="cursor-pointer">
                  <ListPlus /> Aufgabe erfassen
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger className={cn(trigger, "pl-1")}>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-[10px] font-semibold text-background">
                {initialen(vorname, nachname)}
              </span>
              <span className="hidden lg:inline">{vorname}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>
                <p className="font-medium">
                  {vorname} {nachname}
                </p>
                <p className="truncate text-xs font-normal text-muted-foreground">{email ?? ROLLEN[rolle]}</p>
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
                  <HelpCircle /> Hilfe
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <form action={abmelden}>
                <button
                  type="submit"
                  className="relative flex h-8 w-full cursor-pointer select-none items-center gap-2 rounded-[4px] px-2 text-[13px] text-destructive outline-none transition-colors hover:bg-destructive-soft"
                >
                  <LogOut className="h-4 w-4" />
                  Abmelden
                </button>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
