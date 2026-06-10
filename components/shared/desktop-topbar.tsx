import { Building2 } from "lucide-react";

import { ROLLEN } from "@/lib/constants";
import { initialen } from "@/lib/utils";
import type { FahrlehrerRolle } from "@/lib/types";

interface DesktopTopbarProps {
  fahrschuleName: string;
  vorname: string;
  nachname: string;
  rolle: FahrlehrerRolle;
}

/**
 * Schmale obere Leiste für Desktop – gibt der Web-App den Rahmen eines
 * echten Verwaltungs-Tools (statt einer Handy-App). Nutzer/Logout bleiben
 * in der Sidebar; hier stehen Betrieb und Datum als Kontext.
 */
export function DesktopTopbar({
  fahrschuleName,
  vorname,
  nachname,
  rolle,
}: DesktopTopbarProps) {
  const heute = new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <header className="sticky top-0 z-20 hidden h-14 items-center justify-between border-b bg-card/80 px-6 backdrop-blur md:flex print:hidden">
      <div className="flex items-center gap-2 text-sm">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-foreground">{fahrschuleName}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="hidden text-sm text-muted-foreground lg:inline">{heute}</span>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {initialen(vorname, nachname)}
          </div>
          <div className="leading-tight">
            <p className="text-sm font-medium text-foreground">
              {vorname} {nachname}
            </p>
            <p className="text-xs text-muted-foreground">{ROLLEN[rolle]}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
