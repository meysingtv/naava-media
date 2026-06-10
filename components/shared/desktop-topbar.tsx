"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronsRight, LogOut, RefreshCw } from "lucide-react";

import { NAV_ITEMS } from "@/components/shared/nav-items";
import { ROLLEN } from "@/lib/constants";
import { cn, initialen } from "@/lib/utils";
import { abmelden } from "@/app/auth/actions";
import type { FahrlehrerRolle } from "@/lib/types";

const RECENT_KEY = "naava-recent";

const iconBtn =
  "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50";

interface DesktopTopbarProps {
  collapsed: boolean;
  onToggle: () => void;
  vorname: string;
  nachname: string;
  rolle: FahrlehrerRolle;
}

export function DesktopTopbar({ collapsed, onToggle, vorname, nachname, rolle }: DesktopTopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [recent, setRecent] = useState<{ href: string; label: string }[]>([]);

  const aktuell = NAV_ITEMS.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));

  // „Zuletzt besucht" pflegen (liest/schreibt bei jeder Navigation).
  useEffect(() => {
    if (!aktuell) return;
    let vorhanden: { href: string; label: string }[] = [];
    try {
      const r = localStorage.getItem(RECENT_KEY);
      if (r) vorhanden = JSON.parse(r);
    } catch {
      /* ignorieren */
    }
    const next = [
      { href: aktuell.href, label: aktuell.label },
      ...vorhanden.filter((p) => p.href !== aktuell.href),
    ].slice(0, 6);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* ignorieren */
    }
    setRecent(next);
  }, [aktuell]);

  const schnell = recent.filter((p) => p.href !== aktuell?.href).slice(0, 4);

  return (
    <header className="sticky top-0 z-20 hidden h-12 items-center gap-1.5 border-b bg-card px-3 md:flex print:hidden">
      {collapsed && (
        <button type="button" onClick={onToggle} title="Navigation einblenden" aria-label="Navigation einblenden" className={iconBtn}>
          <ChevronsRight className="h-5 w-5" />
        </button>
      )}

      <button
        type="button"
        onClick={() => start(() => router.refresh())}
        title="Daten aktualisieren"
        aria-label="Daten aktualisieren"
        disabled={pending}
        className={iconBtn}
      >
        <RefreshCw className={cn("h-4 w-4", pending && "animate-spin")} />
      </button>

      <span className="ml-1 text-sm font-semibold text-foreground">{aktuell?.label ?? "Übersicht"}</span>

      {schnell.length > 0 && (
        <>
          <div className="mx-1.5 h-5 w-px shrink-0 bg-border" />
          <span className="hidden shrink-0 text-xs text-muted-foreground xl:inline">Zuletzt:</span>
          <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
            {schnell.map((p) => (
              <button
                key={p.href}
                type="button"
                onClick={() => router.push(p.href)}
                className="whitespace-nowrap rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {p.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Nutzer + Logout */}
      <div className="ml-auto flex shrink-0 items-center gap-2 pl-2">
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
        <form action={abmelden}>
          <button type="submit" title="Abmelden" aria-label="Abmelden" className={iconBtn}>
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
