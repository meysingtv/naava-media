"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import {
  aktiverBereich,
  bereicheFuer,
  bereichsZaehler,
  GRUPPEN_TITEL,
  zaehlerTon,
  type Bereich,
  type Zaehler,
} from "@/components/shared/bereiche";
import { SidebarBereich, SidebarItem } from "@/components/shared/sidebar-item";
import { useSidebar } from "@/components/shared/sidebar-context";
import { cn } from "@/lib/utils";
import type { FahrlehrerRolle } from "@/lib/types";

function alsEintrag(b: Bereich) {
  return { href: b.items[0].href, label: b.label, icon: b.icon, rollen: b.items[0].rollen };
}

/**
 * Hauptnavigation v5: Gruppen mit Überschrift, Bereiche mit mehreren Seiten
 * klappen auf. Offen ist der aktive Bereich; weitere lassen sich über den
 * Pfeil öffnen. Beim Wechsel in einen anderen Bereich gilt wieder die
 * Grundstellung – die Liste wächst nicht unbemerkt.
 *
 * Rollen-Sichtbarkeit ausschließlich über `bereicheFuer(rolle)`.
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
  const { bereich: aktiv, item: aktivItem } = aktiverBereich(bereiche, pathname);
  const aktivKey = aktiv?.key;

  const [umgeschaltet, setUmgeschaltet] = React.useState<Record<string, boolean>>({});
  React.useEffect(() => {
    setUmgeschaltet({});
  }, [aktivKey]);

  const gruppen: Bereich[][] = [];
  for (const b of bereiche.filter((x) => x.gruppe !== "fuss")) {
    const letzte = gruppen[gruppen.length - 1];
    if (letzte && letzte[0].gruppe === b.gruppe) letzte.push(b);
    else gruppen.push([b]);
  }

  return (
    <nav aria-label="Bereiche" className="scrollbar-sidebar min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4 pt-1">
      {gruppen.map((gruppe, gi) => {
        const titel = GRUPPEN_TITEL[gruppe[0].gruppe];
        return (
          <div
            key={gruppe[0].gruppe}
            className={cn(gi > 0 && (eingeklappt ? "mx-2 mt-3 border-t border-sidebar-border pt-3" : "mt-5"))}
          >
            {titel && !eingeklappt && (
              <p className="mb-0.5 flex h-6 items-center px-2 text-xs font-medium text-foreground-tertiary">{titel}</p>
            )}
            <ul className="space-y-0.5">
              {gruppe.map((b) =>
                b.items.length > 1 ? (
                  <SidebarBereich
                    key={b.key}
                    bereich={b}
                    aktiv={b.key === aktivKey}
                    aktivHref={b.key === aktivKey ? aktivItem?.href : undefined}
                    offen={umgeschaltet[b.key] ?? b.key === aktivKey}
                    onUmschalten={() =>
                      setUmgeschaltet((u) => ({ ...u, [b.key]: !(u[b.key] ?? b.key === aktivKey) }))
                    }
                    zaehler={zaehler}
                    imDrawer={imDrawer}
                  />
                ) : (
                  <SidebarItem
                    key={b.key}
                    item={alsEintrag(b)}
                    aktiv={b.key === aktivKey}
                    badge={bereichsZaehler(b, zaehler)}
                    ton={zaehlerTon(b.items[0].badgeKey)}
                    imDrawer={imDrawer}
                  />
                ),
              )}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

/** Hilfe und Einstellungen im Fuß der Navigation (als `<li>`-Einträge). */
export function SidebarFussEintraege({ rolle, imDrawer }: { rolle: FahrlehrerRolle; imDrawer?: boolean }) {
  const pathname = usePathname();
  const bereiche = React.useMemo(() => bereicheFuer(rolle), [rolle]);
  const { bereich: aktiv } = aktiverBereich(bereiche, pathname);

  return (
    <>
      {bereiche
        .filter((b) => b.gruppe === "fuss")
        .map((b) => (
          <SidebarItem key={b.key} item={alsEintrag(b)} aktiv={aktiv?.key === b.key} imDrawer={imDrawer} />
        ))}
    </>
  );
}
