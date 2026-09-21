"use client";

import * as React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSidebar } from "@/components/shared/sidebar-context";
import { cn } from "@/lib/utils";
import type { BereichItem } from "@/components/shared/bereiche";

/**
 * Ein Sidebar-Eintrag: 32 px, Icon 16 px, Label 13/500. Aktiv = hellere
 * Fläche PLUS 3-px-Balken links PLUS weißer Text – die Fläche allein trägt
 * nur 1,19:1 und reicht nicht.
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
        "group relative flex items-center rounded-md text-13 font-medium text-sidebar-foreground/85",
        "hover:bg-sidebar-hover hover:text-sidebar-foreground",
        "data-[active=true]:bg-sidebar-active data-[active=true]:font-semibold data-[active=true]:text-sidebar-active-foreground",
        "data-[active=true]:before:absolute data-[active=true]:before:-left-3 data-[active=true]:before:top-1/2",
        "data-[active=true]:before:h-5 data-[active=true]:before:w-[3px] data-[active=true]:before:-translate-y-1/2",
        "data-[active=true]:before:rounded-r-full data-[active=true]:before:bg-sidebar-bar",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70",
        eingeklappt ? "mx-auto h-10 w-10 justify-center px-0" : imDrawer ? "h-10 gap-2.5 px-2" : "h-8 gap-2.5 px-2",
      )}
    >
      <Icon
        className={cn(
          "shrink-0 text-sidebar-muted transition-colors group-hover:text-sidebar-foreground group-data-[active=true]:text-sidebar-active-foreground",
          eingeklappt || imDrawer ? "h-[18px] w-[18px]" : "h-4 w-4",
        )}
        strokeWidth={aktiv ? 2 : 1.75}
        aria-hidden="true"
      />
      <span className={cn("truncate", eingeklappt && "sr-only")}>{item.label}</span>

      {badge != null &&
        (eingeklappt ? (
          <span
            data-tone={ton}
            className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-sidebar-badge px-1 text-[10px] font-semibold tabular-nums text-sidebar-foreground data-[tone=danger]:bg-destructive data-[tone=danger]:text-white"
          >
            {badge > 99 ? "99+" : badge}
          </span>
        ) : (
          <span
            data-tone={ton}
            className="ml-auto inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-sidebar-badge px-1.5 text-2xs font-semibold tabular-nums text-sidebar-foreground data-[tone=danger]:bg-destructive data-[tone=danger]:text-white"
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
 * Eintrag im Nav-Stil, der kein Link ist (Assistent, Einklappen, Suche).
 * Gleiche Maße und Zustände wie `SidebarItem`.
 */
export function SidebarButton({
  icon: Icon,
  label,
  onClick,
  shortcut,
  offen,
  iconClassName,
  imDrawer,
  className,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  shortcut?: string;
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
        "group relative flex w-full items-center rounded-md text-13 font-medium text-sidebar-foreground/85",
        "hover:bg-sidebar-hover hover:text-sidebar-foreground data-[state=open]:bg-sidebar-hover",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70",
        eingeklappt ? "mx-auto h-10 w-10 justify-center px-0" : "h-8 gap-2.5 px-2",
        className,
      )}
    >
      <Icon
        className={cn("shrink-0", eingeklappt ? "h-[18px] w-[18px]" : "h-4 w-4", iconClassName ?? "text-sidebar-muted")}
        strokeWidth={1.75}
        aria-hidden={true}
      />
      <span className={cn("truncate", eingeklappt && "sr-only")}>{label}</span>
      {shortcut && !eingeklappt && <kbd className="kbd ml-auto">{shortcut}</kbd>}
    </button>
  );

  if (!eingeklappt) return knopf;

  return (
    <Tooltip side="right" sideOffset={10}>
      <TooltipTrigger>{knopf}</TooltipTrigger>
      <TooltipContent>
        {label}
        {shortcut && <kbd className="kbd">{shortcut}</kbd>}
      </TooltipContent>
    </Tooltip>
  );
}
