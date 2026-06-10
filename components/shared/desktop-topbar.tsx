"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Pin, PinOff, X } from "lucide-react";

import { NAV_ITEMS } from "@/components/shared/nav-items";
import { ROLLEN } from "@/lib/constants";
import { cn, initialen } from "@/lib/utils";
import type { FahrlehrerRolle } from "@/lib/types";

interface Anheftung {
  href: string;
  label: string;
}

const STORAGE_KEY = "naava-pins";

interface DesktopTopbarProps {
  vorname: string;
  nachname: string;
  rolle: FahrlehrerRolle;
}

/**
 * Obere Desktop-Leiste: zeigt die aktuelle Seite und erlaubt, Seiten per
 * Klick „anzuheften" (Pin) – die angehefteten Seiten erscheinen als
 * Schnellzugriff. Bewusst kein Drag&Drop, sondern ein eigenes Konzept.
 */
export function DesktopTopbar({ vorname, nachname, rolle }: DesktopTopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [pins, setPins] = useState<Anheftung[]>([]);
  const [geladen, setGeladen] = useState(false);

  useEffect(() => {
    try {
      const roh = localStorage.getItem(STORAGE_KEY);
      if (roh) setPins(JSON.parse(roh) as Anheftung[]);
    } catch {
      /* ignorieren */
    }
    setGeladen(true);
  }, []);
  useEffect(() => {
    if (geladen) localStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
  }, [pins, geladen]);

  const aktuell = NAV_ITEMS.find(
    (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
  );
  const aktuellLabel = aktuell?.label ?? "Übersicht";
  const angeheftet = aktuell ? pins.some((p) => p.href === aktuell.href) : false;

  function togglePin() {
    if (!aktuell) return;
    setPins((prev) =>
      prev.some((p) => p.href === aktuell.href)
        ? prev.filter((p) => p.href !== aktuell.href)
        : [...prev, { href: aktuell.href, label: aktuell.label }],
    );
  }
  function loesen(href: string) {
    setPins((prev) => prev.filter((p) => p.href !== href));
  }

  return (
    <header className="sticky top-0 z-20 hidden h-12 items-center gap-3 border-b bg-card px-4 md:flex print:hidden">
      {/* Aktuelle Seite + Anheften */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">{aktuellLabel}</span>
        {aktuell && (
          <button
            type="button"
            onClick={togglePin}
            title={angeheftet ? "Anheftung lösen" : "Seite anheften"}
            aria-label={angeheftet ? "Anheftung lösen" : "Seite anheften"}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
              angeheftet
                ? "text-primary hover:bg-muted"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {angeheftet ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Angeheftete Seiten */}
      {pins.length > 0 && <div className="h-5 w-px shrink-0 bg-border" />}
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {pins.map((p) => {
          const aktiv = pathname === p.href || pathname.startsWith(`${p.href}/`);
          return (
            <div
              key={p.href}
              className={cn(
                "group flex shrink-0 items-center gap-1 rounded-md py-1 pl-2.5 pr-1 text-sm transition-colors",
                aktiv ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60",
              )}
            >
              <button type="button" onClick={() => router.push(p.href)} className="whitespace-nowrap">
                {p.label}
              </button>
              <button
                type="button"
                onClick={() => loesen(p.href)}
                aria-label={`${p.label} lösen`}
                className="flex h-4 w-4 items-center justify-center rounded-sm text-muted-foreground/70 transition-colors hover:bg-foreground/10 hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Nutzer */}
      <div className="ml-auto flex shrink-0 items-center gap-2">
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
    </header>
  );
}
