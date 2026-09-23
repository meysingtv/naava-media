"use client";

import * as React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSidebar } from "@/components/shared/sidebar-context";
import { cn } from "@/lib/utils";
import type { BereichItem } from "@/components/shared/bereiche";

/**
 * Ein Navigationseintrag: 32 px, Icon 16 px, Label 14/500. Aktiv = hellgraue
 * Fläche, dunkle Schrift und blaues Icon – kein Balken, keine Farbfläche.
 *
 * Tooltips erscheinen ausschließlich im eingeklappten Desktop-Zustand,
 * sonst läse ein Screenreader jedes Label doppelt.
 */
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
  const Icon = item.icon;

  const link = (
    <Link
      href={item.href}
      aria-current={aktiv ? "page" : undefined}
      aria-label={eingeklappt ? item.label : undefined}
      data-active={aktiv}
      data-aktiv-eintrag={aktiv ? "true" : undefined}
      className={cn(
        "group relative flex items-center rounded-md text-sm font-medium text-sidebar-foreground",
        "hover:bg-sidebar-hover hover:text-foreground",
        "data-[active=true]:bg-sidebar-active data-[active=true]:text-sidebar-active-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70",
        eingeklappt ? "mx-auto h-9 w-9 justify-center px-0" : imDrawer ? "h-10 gap-2.5 px-2.5" : "h-8 gap-2.5 px-2.5",
      )}
    >
      <Icon
        className={cn(
          "shrink-0 text-sidebar-muted transition-colors group-hover:text-foreground group-data-[active=true]:text-primary",
          eingeklappt || imDrawer ? "h-[18px] w-[18px]" : "h-4 w-4",
        )}
        strokeWidth={1.75}
        aria-hidden="true"
      />
      <span className={cn("truncate", eingeklappt && "sr-only")}>{item.label}</span>

      {badge != null &&
        (eingeklappt ? (
          <span
            data-tone={ton}
            className="absolute right-0.5 top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-sm bg-sidebar-badge px-1 text-[10px] font-semibold tabular-nums text-foreground-secondary data-[tone=danger]:bg-destructive-soft data-[tone=danger]:text-destructive-text"
          >
            {badge > 99 ? "99+" : badge}
          </span>
        ) : (
          <span
            data-tone={ton}
            className="ml-auto inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-sm px-1 text-xs font-medium tabular-nums text-foreground-tertiary data-[tone=danger]:bg-destructive-soft data-[tone=danger]:text-destructive-text"
          >
            {badge > 99 ? "99+" : badge}
          </span>
        ))}
    </Link>
  );

  if (!eingeklappt) return <li>{link}</li>;

  return (
    <li>
      <Tooltip side="right" sideOffset={10}>
        <TooltipTrigger>{link}</TooltipTrigger>
        <TooltipContent>{item.label}</TooltipContent>
      </Tooltip>
    </li>
  );
}

/**
 * Eintrag im Nav-Stil, der kein Link ist (Assistent, Einklappen).
 * Gleiche Maße und Zustände wie `SidebarItem`. Tastaturkürzel werden
 * bewusst nicht angezeigt – sie funktionieren trotzdem.
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

  const knopf = (
    <button
      type="button"
      onClick={onClick}
      data-state={offen ? "open" : "closed"}
      aria-label={eingeklappt ? label : undefined}
      className={cn(
        "group relative flex w-full items-center rounded-md text-sm font-medium text-sidebar-foreground",
        "hover:bg-sidebar-hover hover:text-foreground data-[state=open]:bg-sidebar-hover",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70",
        eingeklappt ? "mx-auto h-9 w-9 justify-center px-0" : "h-8 gap-2.5 px-2.5",
        className,
      )}
    >
      <Icon
        className={cn("shrink-0", eingeklappt ? "h-[18px] w-[18px]" : "h-4 w-4", iconClassName ?? "text-sidebar-muted")}
        strokeWidth={1.75}
        aria-hidden={true}
      />
      <span className={cn("truncate", eingeklappt && "sr-only")}>{label}</span>
    </button>
  );

  if (!eingeklappt) return knopf;

  return (
    <Tooltip side="right" sideOffset={10}>
      <TooltipTrigger>{knopf}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
