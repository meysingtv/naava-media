"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronsLeft } from "lucide-react";

import {
  navEinstellungenFuer,
  navGruppenFuer,
  navTopFuer,
  type NavItem,
} from "@/components/shared/nav-items";
import { cn } from "@/lib/utils";
import type { FahrlehrerRolle } from "@/lib/types";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  fahrschuleName: string;
  logoUrl: string | null;
  rolle: FahrlehrerRolle;
}

function istAktiv(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const aktiv = istAktiv(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        aktiv
          ? "bg-white/10 font-semibold text-white"
          : "font-medium text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground",
      )}
    >
      {aktiv && (
        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-accent" />
      )}
      <Icon
        className={cn(
          "h-[18px] w-[18px] transition-colors",
          aktiv ? "text-sidebar-accent" : "text-sidebar-muted group-hover:text-sidebar-foreground",
        )}
      />
      {item.label}
    </Link>
  );
}

export function Sidebar({ collapsed, onToggle, fahrschuleName, logoUrl, rolle }: SidebarProps) {
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
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl transition-transform duration-200 ease-out md:flex print:hidden",
        collapsed && "-translate-x-full",
      )}
    >
      <div className="flex h-12 items-center gap-2 border-b border-sidebar-border px-3">
        <button
          type="button"
          onClick={onToggle}
          title="Navigation einklappen"
          aria-label="Navigation einklappen"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-foreground"
        >
          <ChevronsLeft className="h-5 w-5" />
        </button>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={fahrschuleName} className="h-7 max-w-[150px] object-contain" />
        ) : (
          <span className="truncate text-sm font-semibold text-sidebar-foreground">{fahrschuleName}</span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted">
          Navigation
        </p>
        <div className="space-y-0.5">
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
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-foreground"
                >
                  <Icon className="h-[18px] w-[18px]" />
                  <span className="flex-1 text-left">{g.label}</span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", offen && "rotate-180")} />
                </button>
                {offen && (
                  <div className="mt-0.5 space-y-0.5 border-l border-sidebar-border pl-3">
                    {g.items.map((i) => (
                      <NavLink key={i.href} item={i} pathname={pathname} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {einstellungen && (
            <div className="pt-1">
              <NavLink item={einstellungen} pathname={pathname} />
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
}
