"use client";

import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSidebar } from "@/components/shared/sidebar-context";

/** Kleines Client-Blatt im Seitenkopf: öffnet den Mobil-Drawer (< 1024 px). */
export function MobileMenuButton({ className }: { className?: string }) {
  const { setDrawerOffen } = useSidebar();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Menü öffnen"
      className={className}
      onClick={() => setDrawerOffen(true)}
    >
      <Menu className="!size-[20px]" strokeWidth={1.75} />
    </Button>
  );
}

/**
 * Ein- und Ausklappen der Navigation (≥ 1024 px), links in der App-Leiste.
 * Das Symbol folgt dem Attribut am <html> – so stimmt es schon vor der
 * Hydrierung und flackert nicht.
 */
export function NavigationUmschalter({ className }: { className?: string }) {
  const { collapsed, umschalten } = useSidebar();
  return (
    <Tooltip side="bottom" sideOffset={8}>
      <TooltipTrigger>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={collapsed ? "Navigation ausklappen" : "Navigation einklappen"}
          className={className}
          onClick={umschalten}
        >
          <PanelLeftClose className="!size-[18px] [[data-sidebar=collapsed]_&]:hidden" strokeWidth={1.75} />
          <PanelLeftOpen className="hidden !size-[18px] [[data-sidebar=collapsed]_&]:block" strokeWidth={1.75} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{collapsed ? "Ausklappen" : "Einklappen"}</TooltipContent>
    </Tooltip>
  );
}
