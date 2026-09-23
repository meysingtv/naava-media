"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSidebar } from "@/components/shared/sidebar-context";
import { cn } from "@/lib/utils";
import { bereichsZaehler, zaehlerTon, type Bereich, type BereichItem, type Zaehler } from "@/components/shared/bereiche";

/**
 * Bausteine der Navigation v5 – Maße wie in gängigen SaaS-Navigationen:
 * Zeile 32 px (im Mobil-Drawer 40 px), Icon 16 px, Text 14/500. Aktiv =
 * hellblaue Fläche, blaues Icon. Unterseiten hängen an einer feinen
 * Führungslinie; die aktive Unterseite markiert ein blauer Strich darauf.
 *
 * Tooltips erscheinen nur im eingeklappten Desktop-Zustand, sonst läse ein
 * Screenreader jedes Label doppelt.
 */

const ZEILE =
  "group/zeile relative flex w-full items-center rounded-md text-sm font-medium outline-none transition-colors duration-fast " +
  "text-sidebar-foreground hover:bg-sidebar-hover hover:text-foreground " +
  "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70";

const AKTIV = "data-[active=true]:bg-sidebar-active data-[active=true]:text-sidebar-active-foreground";

const ICON =
  "shrink-0 text-sidebar-muted transition-colors group-hover/zeile:text-foreground group-data-[active=true]/zeile:text-primary";

function masse(eingeklappt: boolean, imDrawer?: boolean) {
  if (eingeklappt) return { zeile: "mx-auto h-9 w-9 justify-center", icon: "h-[18px] w-[18px]" };
  if (imDrawer) return { zeile: "h-10 gap-2.5 px-2.5", icon: "h-[18px] w-[18px]" };
  return { zeile: "h-8 gap-2.5 px-2", icon: "h-4 w-4" };
}

/** Zähler als Pille; eingeklappt als kleiner Punkt oben rechts am Icon. */
function Zaehlpille({
  wert,
  ton = "neutral",
  eingeklappt,
}: {
  wert: number;
  ton?: "neutral" | "danger";
  eingeklappt?: boolean;
}) {
  return (
    <span
      data-tone={ton}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold tabular-nums leading-none",
        "bg-sidebar-badge text-foreground-secondary",
        "data-[tone=danger]:bg-destructive data-[tone=danger]:text-destructive-foreground",
        eingeklappt
          ? "absolute -right-1 -top-1 h-4 min-w-4 px-1 text-[10px] ring-2 ring-sidebar"
          : "ml-auto h-[18px] min-w-[18px] px-1.5 text-[11px]",
      )}
    >
      {wert > 99 ? "99+" : wert}
    </span>
  );
}

/** Im eingeklappten Zustand: Beschriftung als Tooltip rechts neben dem Icon. */
function MitTooltip({ an, label, children }: { an: boolean; label: string; children: React.ReactElement }) {
  if (!an) return children;
  return (
    <Tooltip side="right" sideOffset={10}>
      <TooltipTrigger>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** Ein Bereich mit genau einer Seite: ein Link. */
export function SidebarItem({
  item,
  aktiv,
  badge,
  ton = "neutral",
  imDrawer,
}: {
  item: BereichItem;
  aktiv: boolean;
  badge?: number;
  ton?: "neutral" | "danger";
  /** Im Drawer wird nie eingeklappt gerendert. */
  imDrawer?: boolean;
}) {
  const { collapsed } = useSidebar();
  const eingeklappt = collapsed && !imDrawer;
  const m = masse(eingeklappt, imDrawer);
  const Icon = item.icon;

  return (
    <li>
      <MitTooltip an={eingeklappt} label={item.label}>
        <Link
          href={item.href}
          aria-current={aktiv ? "page" : undefined}
          aria-label={eingeklappt ? item.label : undefined}
          data-active={aktiv}
          className={cn(ZEILE, AKTIV, m.zeile)}
        >
          <Icon className={cn(ICON, m.icon)} strokeWidth={1.75} aria-hidden="true" />
          <span className={cn("truncate", eingeklappt && "sr-only")}>{item.label}</span>
          {badge != null && <Zaehlpille wert={badge} ton={ton} eingeklappt={eingeklappt} />}
        </Link>
      </MitTooltip>
    </li>
  );
}

/**
 * Ein Bereich mit mehreren Seiten: Der Name führt auf die erste Seite, der
 * Pfeil klappt die Unterseiten auf und zu, ohne die Seite zu wechseln.
 * Eingeklappt bleibt nur das Icon – ein Link auf die erste Seite.
 */
export function SidebarBereich({
  bereich,
  aktiv,
  aktivHref,
  offen,
  onUmschalten,
  zaehler,
  imDrawer,
}: {
  bereich: Bereich;
  aktiv: boolean;
  /** Adresse der gerade offenen Seite, falls sie zu diesem Bereich gehört. */
  aktivHref?: string;
  offen: boolean;
  onUmschalten: () => void;
  zaehler?: Zaehler;
  imDrawer?: boolean;
}) {
  const { collapsed } = useSidebar();
  const eingeklappt = collapsed && !imDrawer;
  const listeId = React.useId();
  const listeRef = React.useRef<HTMLDivElement>(null);
  const ersterLauf = React.useRef(true);
  const m = masse(eingeklappt, imDrawer);

  // Nach dem Aufklappen die Unterseiten in den sichtbaren Bereich holen –
  // die Bereichszeile selbst bleibt dabei stehen.
  React.useEffect(() => {
    if (ersterLauf.current) {
      ersterLauf.current = false;
      return;
    }
    if (!offen) return;
    const t = window.setTimeout(() => {
      const liste = listeRef.current;
      const nav = liste?.closest("nav");
      if (!liste || !nav) return;
      const l = liste.getBoundingClientRect();
      const n = nav.getBoundingClientRect();
      const fehlt = l.bottom - n.bottom + 8;
      if (fehlt > 0) nav.scrollBy({ top: Math.min(fehlt, l.top - n.top - 40), behavior: "smooth" });
    }, 200);
    return () => window.clearTimeout(t);
  }, [offen]);
  const Icon = bereich.icon;
  const summe = bereichsZaehler(bereich, zaehler);
  const ton = bereich.items.some((i) => zaehlerTon(i.badgeKey) === "danger") ? "danger" : "neutral";
  const erste = bereich.items[0];

  if (eingeklappt) {
    return (
      <SidebarItem
        item={{ href: erste.href, label: bereich.label, icon: bereich.icon, rollen: erste.rollen }}
        aktiv={aktiv}
        badge={summe}
        ton={ton}
      />
    );
  }

  return (
    <li>
      <div
        data-active={aktiv}
        className={cn(
          "group/zeile relative flex items-center rounded-md transition-colors duration-fast hover:bg-sidebar-hover",
          imDrawer ? "h-10" : "h-8",
        )}
      >
        <Link
          href={erste.href}
          className={cn(
            "flex h-full min-w-0 flex-1 items-center gap-2.5 rounded-md text-sm font-medium outline-none",
            "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70",
            imDrawer ? "pl-2.5" : "pl-2",
            aktiv ? "text-foreground" : "text-sidebar-foreground group-hover/zeile:text-foreground",
          )}
        >
          <Icon className={cn(ICON, m.icon)} strokeWidth={1.75} aria-hidden="true" />
          <span className="truncate">{bereich.label}</span>
        </Link>
        {!offen && summe != null && <Zaehlpille wert={summe} ton={ton} />}
        <button
          type="button"
          onClick={onUmschalten}
          aria-expanded={offen}
          aria-controls={listeId}
          aria-label={`${bereich.label}: Unterseiten ${offen ? "ausblenden" : "anzeigen"}`}
          className="ml-1 mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded text-sidebar-muted outline-none transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
        >
          <ChevronRight
            className={cn("h-3.5 w-3.5 transition-transform duration-fast motion-reduce:transition-none", offen && "rotate-90")}
            strokeWidth={2}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Auf- und Zuklappen über die Zeilenhöhe; zu = unsichtbar und nicht fokussierbar. */}
      <div
        id={listeId}
        ref={listeRef}
        className={cn(
          "grid transition-[grid-template-rows,visibility] duration-overlay ease-soft motion-reduce:transition-none",
          offen ? "visible grid-rows-[1fr]" : "invisible grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <ul className={cn("space-y-0.5 border-l border-sidebar-border py-0.5 pl-2", imDrawer ? "ml-[18px]" : "ml-[15px]")}>
            {bereich.items.map((i) => (
              <SidebarUnterpunkt
                key={i.href}
                item={i}
                aktiv={i.href === aktivHref}
                badge={i.badgeKey ? zaehler?.[i.badgeKey] || undefined : undefined}
                imDrawer={imDrawer}
              />
            ))}
          </ul>
        </div>
      </div>
    </li>
  );
}

/** Unterseite eines Bereichs – ohne Icon, bündig mit dem Namen darüber. */
function SidebarUnterpunkt({
  item,
  aktiv,
  badge,
  imDrawer,
}: {
  item: BereichItem;
  aktiv: boolean;
  badge?: number;
  imDrawer?: boolean;
}) {
  return (
    <li className="relative">
      {aktiv && (
        <span aria-hidden="true" className="absolute -left-[9px] bottom-1.5 top-1.5 w-0.5 rounded-full bg-primary" />
      )}
      <Link
        href={item.href}
        aria-current={aktiv ? "page" : undefined}
        data-active={aktiv}
        className={cn(
          "flex items-center gap-2 rounded-md pl-2.5 pr-2 font-medium outline-none transition-colors duration-fast",
          "text-foreground-secondary hover:bg-sidebar-hover hover:text-foreground",
          AKTIV,
          "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70",
          imDrawer ? "h-9 text-sm" : "h-7 text-13",
        )}
      >
        <span className="truncate">{item.label}</span>
        {badge != null && <Zaehlpille wert={badge} ton={zaehlerTon(item.badgeKey)} />}
      </Link>
    </li>
  );
}

/**
 * Eintrag im Nav-Stil, der kein Link ist (Assistent, Ausklappen).
 * Gleiche Maße und Zustände wie `SidebarItem`.
 */
export function SidebarButton({
  icon: Icon,
  label,
  onClick,
  offen,
  iconClassName,
  imDrawer,
  className,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  offen?: boolean;
  iconClassName?: string;
  imDrawer?: boolean;
  className?: string;
}) {
  const { collapsed } = useSidebar();
  const eingeklappt = collapsed && !imDrawer;
  const m = masse(eingeklappt, imDrawer);

  return (
    <MitTooltip an={eingeklappt} label={label}>
      <button
        type="button"
        onClick={onClick}
        data-state={offen ? "open" : "closed"}
        aria-label={eingeklappt ? label : undefined}
        className={cn(ZEILE, "data-[state=open]:bg-sidebar-hover", m.zeile, className)}
      >
        <Icon className={cn(ICON, m.icon, iconClassName)} strokeWidth={1.75} aria-hidden={true} />
        <span className={cn("truncate", eingeklappt && "sr-only")}>{label}</span>
      </button>
    </MitTooltip>
  );
}
