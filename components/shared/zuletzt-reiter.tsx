"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, X } from "lucide-react";

import { BEREICHE, aktiverBereich, bereicheFuer } from "@/components/shared/bereiche";
import { useSidebarOptional } from "@/components/shared/sidebar-context";
import { cn } from "@/lib/utils";

const SCHLUESSEL = "fsapp.zuletzt";
const MAX = 6;
/** Mindestbreite eines Reiters, damit der Titel lesbar bleibt (inkl. Abstand). */
const REITER_BREITE = 136;

interface Eintrag {
  href: string;
  label: string;
  bereich: string;
  zuletzt: number;
}

function laden(): Eintrag[] {
  try {
    const roh = JSON.parse(localStorage.getItem(SCHLUESSEL) ?? "[]");
    return Array.isArray(roh) ? roh.filter((e) => e && typeof e.href === "string" && typeof e.label === "string") : [];
  } catch {
    return [];
  }
}

function speichern(liste: Eintrag[]) {
  try {
    localStorage.setItem(SCHLUESSEL, JSON.stringify(liste));
  } catch {
    /* privates Fenster o. Ä. – dann eben ohne Merken */
  }
}

/**
 * Zuletzt geöffnete Seiten als Reiter in der App-Leiste – wie Tabs im
 * Browser: Die Reihenfolge bleibt stabil, neue Seiten kommen hinten dazu,
 * der am längsten nicht genutzte fällt bei mehr als sechs heraus. Auf
 * Detailseiten steht der Seitentitel im Reiter („Lena Hoffmann",
 * „Rechnung RE-0128"). Gezeigt werden die ANDEREN zuletzt geöffneten
 * Seiten – so viele, wie lesbar in den Platz bis zur Suche passen, die
 * zuletzt genutzten zuerst. Gemerkt wird nur in diesem Browser.
 */
export function ZuletztReiter({ className }: { className?: string }) {
  const pathname = usePathname();
  const rolle = useSidebarOptional()?.rolle;
  const [liste, setListe] = React.useState<Eintrag[]>([]);
  const [platz, setPlatz] = React.useState(0);
  const leisteRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    setListe(laden());
  }, []);

  // Verfügbare Breite messen – daraus ergibt sich, wie viele Reiter passen.
  React.useEffect(() => {
    const el = leisteRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    // 24 px gehen an das Uhr-Symbol vorne.
    const beobachter = new ResizeObserver(([eintrag]) => setPlatz(Math.floor((eintrag.contentRect.width - 24) / REITER_BREITE)));
    beobachter.observe(el);
    return () => beobachter.disconnect();
  }, []);

  React.useEffect(() => {
    if (!rolle) return;
    const { bereich, item } = aktiverBereich(bereicheFuer(rolle), pathname);
    if (!bereich || !item) return;

    // Kurz warten, bis der Seitenkopf der neuen Seite im DOM steht.
    const t = window.setTimeout(() => {
      let label = item.label;
      if (pathname !== item.href) {
        const h1 = document.querySelector<HTMLElement>("[data-page-header] h1");
        const titel = h1?.dataset.kurztitel || h1?.textContent?.trim();
        if (titel) label = titel;
      }
      setListe((vorher) => {
        const basis = vorher.length ? vorher : laden();
        const vorhanden = basis.find((e) => e.href === pathname);
        let neu: Eintrag[];
        if (vorhanden) {
          neu = basis.map((e) => (e.href === pathname ? { ...e, label, zuletzt: Date.now() } : e));
        } else {
          neu = [...basis, { href: pathname, label, bereich: bereich.key, zuletzt: Date.now() }];
          if (neu.length > MAX) {
            const aeltester = neu.reduce((a, b) => (a.zuletzt <= b.zuletzt ? a : b));
            neu = neu.filter((e) => e !== aeltester);
          }
        }
        speichern(neu);
        return neu;
      });
    }, 150);
    return () => window.clearTimeout(t);
  }, [pathname, rolle]);

  function schliessen(href: string) {
    setListe((vorher) => {
      const neu = vorher.filter((e) => e.href !== href);
      speichern(neu);
      return neu;
    });
  }

  // Die `platz` zuletzt genutzten anderen Seiten in fester Reihenfolge.
  const andere = liste.filter((e) => e.href !== pathname);
  const nachNutzung = [...andere].sort((a, b) => b.zuletzt - a.zuletzt);
  const sichtbar = new Set(nachNutzung.slice(0, Math.max(0, platz)).map((e) => e.href));
  const gezeigt = andere.filter((e) => sichtbar.has(e.href));

  return (
    <nav
      ref={leisteRef}
      aria-label="Zuletzt geöffnet"
      className={cn("min-w-0 flex-1 items-center gap-1 overflow-hidden", className)}
    >
      {gezeigt.length > 0 && (
        <History
          className="mr-1 h-4 w-4 shrink-0 text-foreground-tertiary"
          strokeWidth={1.75}
          aria-label="Zuletzt geöffnet"
        />
      )}
      {gezeigt.map((e) => {
        const aktiv = e.href === pathname;
        const Icon = BEREICHE.find((b) => b.key === e.bereich)?.icon;
        return (
          <div
            key={e.href}
            className={cn(
              "group relative flex h-8 w-[132px] shrink-0 items-center rounded-md transition-colors",
              aktiv ? "bg-muted text-foreground" : "text-foreground-secondary hover:bg-muted/70 hover:text-foreground",
            )}
          >
            <Link
              href={e.href}
              aria-current={aktiv ? "page" : undefined}
              className="flex h-full min-w-0 flex-1 items-center gap-1.5 rounded-md pl-2.5 pr-2 text-13 font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70"
            >
              {Icon && (
                <Icon
                  className={cn("h-3.5 w-3.5 shrink-0", aktiv ? "text-primary" : "text-foreground-tertiary")}
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              )}
              <span className="truncate">{e.label}</span>
            </Link>
            <button
              type="button"
              onClick={() => schliessen(e.href)}
              aria-label={`${e.label} schließen`}
              className={cn(
                "absolute right-1 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded bg-muted text-foreground-tertiary outline-none transition-opacity hover:bg-border hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/70",
                aktiv ? "opacity-100" : "opacity-0 group-hover:opacity-100",
              )}
            >
              <X className="h-3 w-3" strokeWidth={2} />
            </button>
          </div>
        );
      })}
    </nav>
  );
}
