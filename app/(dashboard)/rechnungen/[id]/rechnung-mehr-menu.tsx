"use client";

import { useTransition } from "react";
import { Bell, FileCode2, MoreHorizontal, Printer, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { rechnungStatusSetzen } from "../actions";

/**
 * Weitere Aktionen einer Rechnung im Menü „…": XRechnung, Drucken,
 * Mahnschreiben ansehen und – für bezahlte oder überfällige Rechnungen –
 * zurück auf „offen" setzen. Die Hauptaktionen stehen sichtbar im Kopf.
 */
export function RechnungMehrMenu({
  id,
  status,
  mahnstufe,
}: {
  id: string;
  status: "offen" | "bezahlt" | "ueberfaellig";
  mahnstufe: number;
}) {
  const [pending, start] = useTransition();

  function alsOffen() {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("status", "offen");
    start(() => rechnungStatusSetzen(fd));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon-sm" aria-label="Weitere Aktionen" disabled={pending}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem asChild>
          <a href={`/rechnungen/${id}/xrechnung`} className="cursor-pointer">
            <FileCode2 /> XRechnung herunterladen
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => window.print()} className="cursor-pointer">
          <Printer /> Drucken
        </DropdownMenuItem>
        {mahnstufe > 0 && (
          <DropdownMenuItem asChild>
            <a href={`/rechnungen/${id}/mahnung`} className="cursor-pointer">
              <Bell /> Mahnschreiben ansehen
            </a>
          </DropdownMenuItem>
        )}
        {status !== "offen" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={alsOffen} className="cursor-pointer">
              <RotateCcw /> Als offen markieren
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
