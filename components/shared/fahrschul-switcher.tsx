"use client";

import Link from "next/link";
import { Check, ChevronsUpDown, Settings } from "lucide-react";

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
import { cn } from "@/lib/utils";
import { fahrschuleWechseln } from "@/app/(dashboard)/fahrschul-actions";
import type { FahrlehrerRolle, FahrschulMitgliedschaft } from "@/lib/types";

/** Kürzel für die Kachel: „Fahrschule Weber" → „W", „City Drive" → „CD". */
function kuerzel(name: string): string {
  const woerter = name
    .replace(/^fahrschule\s+/i, "")
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Za-z0-9ÄÖÜäöüß]/g, ""))
    .filter(Boolean);
  const k = woerter
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return k || "F";
}

/** Logo der Fahrschule oder eine blaue Kachel mit Kürzel. */
function Marke({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover ring-1 ring-foreground/10" />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-[13px] font-semibold tracking-tight text-primary-foreground shadow-[inset_0_-1px_0_rgba(0,0,0,0.12)]"
    >
      {kuerzel(name)}
    </span>
  );
}

/**
 * Kopf der Navigation: Fahrschule mit Logo (oder Kürzel), Name und Ort.
 * Das Menü wechselt zwischen Fahrschulen (Server-Action `fahrschuleWechseln`)
 * und führt zu den Einstellungen.
 */
export function FahrschulSwitcher({
  fahrschuleName,
  ort,
  logoUrl,
  rolle,
  fahrschulen,
  aktiveFahrschuleId,
  imDrawer,
  className,
}: {
  fahrschuleName: string;
  ort: string | null;
  logoUrl: string | null;
  rolle: FahrlehrerRolle;
  fahrschulen: FahrschulMitgliedschaft[];
  aktiveFahrschuleId: string | null;
  imDrawer?: boolean;
  className?: string;
}) {
  const { collapsed } = useSidebar();
  const eingeklappt = collapsed && !imDrawer;
  const istChef = rolle === "chef";
  const mehrere = fahrschulen.length > 1;
  const beschriftung = `${fahrschuleName}${ort ? ` · ${ort}` : ""}`;

  const trigger = (
    <DropdownMenuTrigger
      aria-label={eingeklappt ? beschriftung : undefined}
      className={cn(
        "flex items-center rounded-lg outline-none transition-colors duration-fast",
        "hover:bg-sidebar-hover data-[state=open]:bg-sidebar-hover",
        "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70",
        eingeklappt ? "h-10 w-10 justify-center" : "h-11 w-full min-w-0 flex-1 gap-2.5 pl-1.5 pr-2",
        className,
      )}
    >
      <Marke name={fahrschuleName} logoUrl={logoUrl} />
      {!eingeklappt && (
        <>
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate text-sm font-semibold leading-5 text-foreground">{fahrschuleName}</span>
            <span className="block truncate text-xs leading-4 text-foreground-tertiary">{ort || "Fahrschule"}</span>
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
          <TooltipContent>{beschriftung}</TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}

      <DropdownMenuContent align="start" sideOffset={6} className="w-64">
        <DropdownMenuLabel className="flex items-center gap-2.5 text-foreground">
          <Marke name={fahrschuleName} logoUrl={logoUrl} />
          <span className="min-w-0">
            <span className="block truncate text-13 font-semibold">{fahrschuleName}</span>
            <span className="block truncate text-xs font-normal text-muted-foreground">{ort || "Fahrschule"}</span>
          </span>
        </DropdownMenuLabel>

        {mehrere && (
          <>
            <DropdownMenuSeparator />
            <p className="px-2 pb-1 pt-1.5 text-xs font-medium text-muted-foreground">Fahrschule wechseln</p>
            {fahrschulen.map((f) => (
              <form key={f.id} action={fahrschuleWechseln}>
                <input type="hidden" name="id" value={f.id} />
                <button
                  type="submit"
                  className="flex h-8 w-full cursor-pointer items-center justify-between gap-2 rounded-sm px-2 text-13 text-foreground outline-none transition-colors hover:bg-accent focus-visible:bg-accent"
                >
                  <span className="truncate">{f.name}</span>
                  {f.id === aktiveFahrschuleId && (
                    <Check className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} aria-hidden="true" />
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
                <Settings /> Einstellungen der Fahrschule
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
