"use client";

import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
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
