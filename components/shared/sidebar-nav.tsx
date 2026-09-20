"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { aktiverBereich, bereicheFuer, type Zaehler } from "@/components/shared/bereiche";
import { SidebarItem } from "@/components/shared/sidebar-item";
import { useSidebar } from "@/components/shared/sidebar-context";
import { cn } from "@/lib/utils";
import type { FahrlehrerRolle } from "@/lib/types";

/**
 * Navigation in Gruppen – die Rollen-Sichtbarkeit kommt ausschließlich aus
 * `bereicheFuer(rolle)`. Aktiv-Erkennung über `aktiverBereich`: der längste
 * Präfix gewinnt, deshalb markiert `/fahrlehrer/rollen` „Rollen & Rechte"
 * und nicht „Fahrlehrer".
 *
 * Eingeklappt werden die Gruppentitel zu feinen Trennlinien – die
 * Gruppierung bleibt sichtbar.
 */
export function SidebarNav({
  rolle,
  zaehler,
  imDrawer,
}: {
  rolle: FahrlehrerRolle;
  zaehler?: Zaehler;
  imDrawer?: boolean;
}) {
  const pathname = usePathname();
  const { collapsed } = useSidebar();
  const eingeklappt = collapsed && !imDrawer;
  const bereiche = React.useMemo(() => bereicheFuer(rolle), [rolle]);
  const { item: aktivItem } = aktiverBereich(bereiche, pathname);
  const navRef = React.useRef<HTMLElement>(null);

  // Aktiven Eintrag nach dem Mounten in den sichtbaren Bereich holen.
  React.useEffect(() => {
    navRef.current?.querySelector("[data-aktiv-eintrag]")?.scrollIntoView({ block: "nearest" });
  }, [pathname]);

  return (
    <nav ref={navRef} className="flex-1 overflow-y-auto scrollbar-sidebar px-3 pb-2 pt-1">
      {bereiche.map((gruppe, gi) => (
        <div key={gruppe.key}>
          {eingeklappt ? (
            gi > 0 && <div className="mx-3 my-2 h-px bg-sidebar-border" aria-hidden="true" />
          ) : (
            <p className={cn("nav-group px-2 pb-1 pt-4", gi === 0 && "pt-2")}>{gruppe.label.toUpperCase()}</p>
          )}
          <ul className="space-y-0.5">
            {gruppe.items.map((item) => (
              <SidebarItem
                key={item.href}
                item={item}
                aktiv={aktivItem?.href === item.href}
                badge={item.badgeKey ? zaehler?.[item.badgeKey] : undefined}
                ton={item.badgeKey === "rechnungen_ueberfaellig" ? "danger" : "neutral"}
                imDrawer={imDrawer}
              />
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
