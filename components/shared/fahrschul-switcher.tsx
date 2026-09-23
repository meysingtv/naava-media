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
import { Logo } from "@/components/shared/logo";
import { useSidebar } from "@/components/shared/sidebar-context";
import { cn } from "@/lib/utils";
import { fahrschuleWechseln } from "@/app/(dashboard)/fahrschul-actions";
import type { FahrlehrerRolle, FahrschulMitgliedschaft } from "@/lib/types";

/**
 * Kopf der Sidebar: Fahrschul-Umschalter mit Name und Ort. Die Umschalt-
 * Logik (Server-Action `fahrschuleWechseln`) ist unverändert aus der alten
 * Top-Bar übernommen.
 */
export function FahrschulSwitcher({
  fahrschuleName,
  ort,
  logoUrl,
  rolle,
  fahrschulen,
  aktiveFahrschuleId,
  imDrawer,
}: {
  fahrschuleName: string;
  ort: string | null;
  logoUrl: string | null;
  rolle: FahrlehrerRolle;
  fahrschulen: FahrschulMitgliedschaft[];
  aktiveFahrschuleId: string | null;
  imDrawer?: boolean;
}) {
  const { collapsed } = useSidebar();
  const eingeklappt = collapsed && !imDrawer;
  const istChef = rolle === "chef";
  const mehrere = fahrschulen.length > 1;

  const marke = logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logoUrl} alt="" className="h-7 w-7 shrink-0 rounded-[6px] object-cover" />
  ) : (
    <Logo compact />
  );

  const trigger = (
    <DropdownMenuTrigger
      aria-label={eingeklappt ? `${fahrschuleName}${ort ? ` · ${ort}` : ""}` : undefined}
      className={cn(
        "flex items-center rounded-md outline-none transition-colors duration-fast",
        "hover:bg-sidebar-hover data-[state=open]:bg-sidebar-hover",
        "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70",
        eingeklappt ? "h-10 w-10 justify-center" : "h-10 w-full gap-2.5 px-2",
      )}
    >
      {marke}
      {!eingeklappt && (
        <>
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate text-sm font-semibold text-foreground">{fahrschuleName}</span>
            {ort && <span className="block truncate text-xs text-foreground-tertiary">{ort}</span>}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-sidebar-muted" strokeWidth={1.75} aria-hidden="true" />
        </>
      )}
    </DropdownMenuTrigger>
  );

  return (
    <div
      className={cn(
        "flex h-14 shrink-0 items-center px-3",
        eingeklappt && "justify-center px-0",
      )}
    >
      <DropdownMenu>
        {eingeklappt ? (
          <Tooltip side="right" sideOffset={10}>
            <TooltipTrigger>{trigger}</TooltipTrigger>
            <TooltipContent>{`${fahrschuleName}${ort ? ` · ${ort}` : ""}`}</TooltipContent>
          </Tooltip>
        ) : (
          trigger
        )}

        <DropdownMenuContent align="start" sideOffset={4} className="w-64">
          <DropdownMenuLabel className="text-foreground">
            <span className="block truncate text-13 font-medium">{fahrschuleName}</span>
            {ort && <span className="block truncate text-xs font-normal text-muted-foreground">{ort}</span>}
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
                  <Settings /> Einstellungen
                </Link>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
