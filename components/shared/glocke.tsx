"use client";

import Link from "next/link";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Glocke in der App-Leiste: führt zu den Terminerinnerungen und zeigt als
 * roten Zähler, wie viele Fahrstunden der nächsten drei Tage noch nicht
 * bestätigt sind.
 */
export function Glocke({ anzahl }: { anzahl: number }) {
  const text =
    anzahl > 0
      ? `${anzahl} ${anzahl === 1 ? "Fahrstunde" : "Fahrstunden"} in den nächsten Tagen noch unbestätigt`
      : "Terminerinnerungen";

  return (
    <Tooltip side="bottom" sideOffset={8}>
      <TooltipTrigger>
        <Button asChild variant="ghost" size="icon-sm" className="relative">
          <Link href="/erinnerungen" aria-label={text}>
            <Bell className="!size-[18px]" strokeWidth={1.75} />
            {anzahl > 0 && (
              <span
                aria-hidden="true"
                className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold tabular-nums leading-none text-white ring-2 ring-background"
              >
                {anzahl > 9 ? "9+" : anzahl}
              </span>
            )}
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  );
}
