"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { aktiverBereich, bereicheFuer, type Bereich, type Zaehler } from "@/components/shared/bereiche";
import { SidebarItem } from "@/components/shared/sidebar-item";
import { useSidebar } from "@/components/shared/sidebar-context";
import { cn } from "@/lib/utils";
import type { FahrlehrerRolle } from "@/lib/types";

/** Summe der Zähler aller Seiten eines Bereichs (z. B. überfällige Rechnungen → Finanzen). */
function bereichsZaehler(b: Bereich, zaehler?: Zaehler): number | undefined {
  let summe = 0;
  let gefunden = false;
  for (const i of b.items) {
    if (i.badgeKey && zaehler?.[i.badgeKey] != null) {
      summe += zaehler[i.badgeKey] ?? 0;
      gefunden = true;
    }
  }
  return gefunden && summe > 0 ? summe : undefined;
}

/**
 * Navigation v4: ein Eintrag je Bereich, keine Gruppentitel – die Gruppen
 * trennt nur ein Abstand. Der Eintrag führt auf die erste Seite des Bereichs,
 * die die Rolle sehen darf; die übrigen Seiten stehen als Reiter im
 * Seitenkopf. Rollen-Sichtbarkeit ausschließlich über `bereicheFuer(rolle)`.
 *
 * `teil="haupt"` rendert die Arbeitsbereiche, `teil="fuss"` Hilfe und
 * Einstellungen unten in der Navigation.
 */
export function SidebarNav({
  rolle,
  zaehler,
  imDrawer,
  teil = "haupt",
}: {
  rolle: FahrlehrerRolle;
  zaehler?: Zaehler;
  imDrawer?: boolean;
  teil?: "haupt" | "fuss";
}) {
  const pathname = usePathname();
  const { collapsed } = useSidebar();
  const eingeklappt = collapsed && !imDrawer;
  const bereiche = React.useMemo(() => bereicheFuer(rolle), [rolle]);
  const { bereich: aktiv } = aktiverBereich(bereiche, pathname);

  const sichtbar = bereiche.filter((b) => (teil === "fuss" ? b.gruppe === "fuss" : b.gruppe !== "fuss"));
  const gruppen: Bereich[][] = [];
  for (const b of sichtbar) {
    const letzte = gruppen[gruppen.length - 1];
    if (letzte && letzte[0].gruppe === b.gruppe) letzte.push(b);
    else gruppen.push([b]);
  }

  if (sichtbar.length === 0) return null;

  return (
    <nav
      aria-label={teil === "fuss" ? "Hilfe und Einstellungen" : undefined}
      className={cn(teil === "haupt" ? "flex-1 overflow-y-auto scrollbar-sidebar px-3 pb-2 pt-2" : "")}
    >
      {gruppen.map((gruppe, gi) => (
        <ul key={gruppe[0].key} className={cn("space-y-px", gi > 0 && (eingeklappt ? "mt-3 border-t border-border pt-3" : "mt-5"))}>
          {gruppe.map((b) => (
            <SidebarItem
              key={b.key}
              item={{ href: b.items[0].href, label: b.label, icon: b.icon, rollen: b.items[0].rollen }}
              aktiv={aktiv?.key === b.key}
              badge={bereichsZaehler(b, zaehler)}
              ton={b.key === "finanzen" ? "danger" : "neutral"}
              imDrawer={imDrawer}
            />
          ))}
        </ul>
      ))}
    </nav>
  );
}
