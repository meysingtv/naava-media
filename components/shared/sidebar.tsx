"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

import {
  navEinstellungenFuer,
  navGruppenFuer,
  navHilfeFuer,
  navTopFuer,
  type NavItem,
} from "@/components/shared/nav-items";
import { cn } from "@/lib/utils";
import type { FahrlehrerRolle } from "@/lib/types";

function istAktiv(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const aktiv = istAktiv(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={aktiv ? "page" : undefined}
      className={cn(
        "group flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors duration-fast ease-soft",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25",
        aktiv
          ? "bg-primary-soft font-medium text-primary"
          : "text-foreground-secondary hover:bg-surface hover:text-foreground",
      )}
    >
      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0 transition-colors duration-fast",
          aktiv ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
        )}
        strokeWidth={1.75}
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function GruppenLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2.5 pb-1.5 pt-5 text-2xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
      {children}
    </p>
  );
}

export function Sidebar({ rolle }: { rolle: FahrlehrerRolle }) {
  const pathname = usePathname();
  const top = navTopFuer(rolle);
  const gruppen = navGruppenFuer(rolle);
  const einstellungen = navEinstellungenFuer(rolle);
  const hilfe = navHilfeFuer(rolle);
  const [zu, setZu] = useState<Set<string>>(new Set());

  const toggleGruppe = (label: string) =>
    setZu((prev) => {
      const n = new Set(prev);
      if (n.has(label)) n.delete(label);
      else n.add(label);
      return n;
    });

  return (
    <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-[248px] shrink-0 flex-col overflow-y-auto border-r bg-background px-3 pb-4 pt-4 scrollbar-thin md:flex print:hidden">
      <nav className="flex flex-1 flex-col">
        <div className="space-y-0.5">
          {top.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>

        {gruppen.map((g) => {
          const kindAktiv = g.items.some((i) => istAktiv(pathname, i.href));
          const offen = !zu.has(g.label) || kindAktiv;
          return (
            <div key={g.label}>
              <button
                type="button"
                onClick={() => toggleGruppe(g.label)}
                aria-expanded={offen}
                className="flex w-full items-center justify-between rounded-md text-left transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25"
              >
                <GruppenLabel>{g.label}</GruppenLabel>
                <ChevronDown
                  className={cn(
                    "mr-2.5 mt-3.5 h-3.5 w-3.5 text-muted-foreground transition-transform duration-fast",
                    !offen && "-rotate-90",
                  )}
                />
              </button>
              {offen && (
                <div className="space-y-0.5">
                  {g.items.map((i) => (
                    <NavLink key={i.href} item={i} pathname={pathname} />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div className="mt-auto space-y-0.5 border-t pt-3">
          {einstellungen && <NavLink item={einstellungen} pathname={pathname} />}
          {hilfe && <NavLink item={hilfe} pathname={pathname} />}
        </div>
      </nav>
    </aside>
  );
}
