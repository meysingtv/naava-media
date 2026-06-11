"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Car, ChevronDown, ChevronsLeft } from "lucide-react";

import {
  navEinstellungenFuer,
  navGruppenFuer,
  navTopFuer,
  type NavItem,
} from "@/components/shared/nav-items";
import { ROLLEN } from "@/lib/constants";
import { cn, initialen } from "@/lib/utils";
import type { FahrlehrerRolle } from "@/lib/types";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  fahrschuleName: string;
  logoUrl: string | null;
  vorname: string;
  nachname: string;
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
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        aktiv
          ? "bg-white/[0.08] font-semibold text-white"
          : "font-medium text-sidebar-muted hover:bg-white/[0.05] hover:text-sidebar-foreground",
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

export function Sidebar({
  collapsed,
  onToggle,
  fahrschuleName,
  logoUrl,
  vorname,
  nachname,
  rolle,
}: SidebarProps) {
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
      {/* Kopf: Logo/Marke + Einklappen */}
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-3">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={fahrschuleName} className="h-8 max-w-[140px] object-contain" />
        ) : (
          <>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-white shadow-sm">
              <Car className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-sidebar-foreground">
              {fahrschuleName}
            </span>
          </>
        )}
        <button
          type="button"
          onClick={onToggle}
          title="Navigation einklappen"
          aria-label="Navigation einklappen"
          className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sidebar-muted transition-colors hover:bg-white/[0.06] hover:text-sidebar-foreground"
        >
          <ChevronsLeft className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-muted">
          Navigation
        </p>
        <div className="space-y-1">
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
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-muted transition-colors hover:bg-white/[0.05] hover:text-sidebar-foreground"
                >
                  <Icon className="h-[18px] w-[18px]" />
                  <span className="flex-1 text-left">{g.label}</span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", offen && "rotate-180")} />
                </button>
                {offen && (
                  <div className="mt-1 space-y-1 border-l border-sidebar-border pl-3">
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

      {/* Profil-Fuß */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2.5 rounded-lg bg-white/[0.03] px-2.5 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent/20 text-xs font-semibold text-sidebar-accent ring-1 ring-inset ring-sidebar-accent/30">
            {initialen(vorname, nachname)}
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[13px] font-medium text-sidebar-foreground">
              {vorname} {nachname}
            </p>
            <p className="truncate text-xs text-sidebar-muted">{ROLLEN[rolle]}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
