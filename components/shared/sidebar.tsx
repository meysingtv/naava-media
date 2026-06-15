"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

import {
  navEinstellungenFuer,
  navGruppenFuer,
  navTopFuer,
  type NavItem,
} from "@/components/shared/nav-items";
import { cn } from "@/lib/utils";
import type { FahrlehrerRolle } from "@/lib/types";

function istAktiv(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, pathname, klein }: { item: NavItem; pathname: string; klein?: boolean }) {
  const aktiv = istAktiv(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-full px-3 text-sm transition-colors",
        klein ? "py-2" : "py-2.5",
        aktiv
          ? "bg-primary font-semibold text-primary-foreground shadow-sm"
          : "font-medium text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <Icon className="h-[18px] w-[18px]" />
      {item.label}
    </Link>
  );
}

export function Sidebar({ rolle }: { rolle: FahrlehrerRolle }) {
  const pathname = usePathname();
  const top = navTopFuer(rolle);
  const gruppen = navGruppenFuer(rolle);
  const einstellungen = navEinstellungenFuer(rolle);
  const [manuell, setManuell] = useState<Set<string>>(new Set());

  const toggleGruppe = (label: string) =>
    setManuell((prev) => {
      const n = new Set(prev);
      if (n.has(label)) n.delete(label);
      else n.add(label);
      return n;
    });

  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 flex-col overflow-y-auto px-3 pb-4 pt-7 md:flex print:hidden">
      <nav className="space-y-1">
        {top.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}

        {gruppen.map((g) => {
          const Icon = g.icon;
          const kindAktiv = g.items.some((i) => istAktiv(pathname, i.href));
          const offen = manuell.has(g.label) || kindAktiv;
          return (
            <div key={g.label} className="pt-1">
              <button
                type="button"
                onClick={() => toggleGruppe(g.label)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium transition-colors",
                  kindAktiv
                    ? "text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span className="flex-1 text-left">{g.label}</span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", offen && "rotate-180")} />
              </button>
              {offen && (
                <div className="mt-1 space-y-1 pl-4">
                  {g.items.map((i) => (
                    <NavLink key={i.href} item={i} pathname={pathname} klein />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {einstellungen && <NavLink item={einstellungen} pathname={pathname} />}
      </nav>
    </aside>
  );
}
