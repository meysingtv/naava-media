"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";

import { ROLLEN } from "@/lib/constants";
import { cn, initialen } from "@/lib/utils";
import type { FahrlehrerRolle } from "@/lib/types";

interface Tab {
  href: string;
  label: string;
}

const STORAGE_KEY = "naava-tabs";

interface DesktopTopbarProps {
  vorname: string;
  nachname: string;
  rolle: FahrlehrerRolle;
}

/**
 * Obere Desktop-Leiste mit Browser-artigem Tab-System: Navigationspunkte aus
 * der Sidebar lassen sich hierher ziehen und bleiben als Tabs (×-schließbar).
 */
export function DesktopTopbar({ vorname, nachname, rolle }: DesktopTopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [ueberZone, setUeberZone] = useState(false);
  const [geladen, setGeladen] = useState(false);

  // Tabs aus dem Speicher laden / sichern (überleben Reload).
  useEffect(() => {
    try {
      const roh = localStorage.getItem(STORAGE_KEY);
      if (roh) setTabs(JSON.parse(roh) as Tab[]);
    } catch {
      /* ignorieren */
    }
    setGeladen(true);
  }, []);
  useEffect(() => {
    if (geladen) localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
  }, [tabs, geladen]);

  function tabHinzufuegen(t: Tab) {
    setTabs((prev) => (prev.some((x) => x.href === t.href) ? prev : [...prev, t]));
    router.push(t.href);
  }
  function tabSchliessen(href: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setTabs((prev) => prev.filter((x) => x.href !== href));
  }
  function alleSchliessen() {
    setTabs([]);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setUeberZone(false);
    const daten = e.dataTransfer.getData("application/x-nav");
    if (!daten) return;
    try {
      const t = JSON.parse(daten) as Tab;
      if (t.href && t.label) tabHinzufuegen(t);
    } catch {
      /* ignorieren */
    }
  }

  const istAktiv = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-20 hidden h-12 items-center gap-2 border-b bg-card px-3 md:flex print:hidden">
      {/* Tab-Zone (Ablagefläche) */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setUeberZone(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setUeberZone(false);
        }}
        onDrop={onDrop}
        className={cn(
          "flex h-full flex-1 items-center gap-1 overflow-x-auto rounded-md px-1 transition-colors",
          ueberZone && "bg-accent",
        )}
      >
        {tabs.length === 0 ? (
          <span className="select-none px-2 text-xs text-muted-foreground">
            Navigationspunkt hierher ziehen, um ihn als Tab zu fixieren
          </span>
        ) : (
          tabs.map((t) => {
            const aktiv = istAktiv(t.href);
            return (
              <div
                key={t.href}
                role="button"
                tabIndex={0}
                onClick={() => router.push(t.href)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") router.push(t.href);
                }}
                className={cn(
                  "flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-sm transition-colors duration-150 animate-in fade-in slide-in-from-left-1",
                  aktiv
                    ? "border-border bg-background font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:bg-muted",
                )}
              >
                <span className="whitespace-nowrap">{t.label}</span>
                <button
                  type="button"
                  onClick={(e) => tabSchliessen(t.href, e)}
                  aria-label={`${t.label} schließen`}
                  className="flex h-4 w-4 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Rechts: Tabs schließen + Nutzer */}
      <div className="flex shrink-0 items-center gap-3">
        {tabs.length > 0 && (
          <button
            type="button"
            onClick={alleSchliessen}
            className="whitespace-nowrap text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Tabs schließen
          </button>
        )}
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
