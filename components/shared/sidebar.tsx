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
          ? "bg-white/15 font-semibold text-white"
          : "font-medium text-sidebar-muted hover:bg-white/10 hover:text-white",
      )}
    >
      {aktiv && (
        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-white" />
      )}
      <Icon
        className={cn(
          "h-[18px] w-[18px] transition-colors",
          aktiv ? "text-white" : "text-sidebar-muted group-hover:text-white",
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
        "fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/5 bg-sidebar text-sidebar-foreground shadow-xl transition-transform duration-200 ease-out md:flex print:hidden",
        collapsed && "-translate-x-full",
      )}
    >
      {/* Kopf: nur Logo (falls vorhanden) + Einklappen */}
      <div className="flex h-12 items-center border-b border-white/10 px-3">
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={fahrschuleName} className="mr-auto h-7 max-w-[150px] object-contain" />
        )}
        <button
          type="button"
          onClick={onToggle}
          title="Navigation einklappen"
          aria-label="Navigation einklappen"
          className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ChevronsLeft className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
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
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-muted transition-colors hover:bg-white/10 hover:text-white"
                >
                  <Icon className="h-[18px] w-[18px]" />
                  <span className="flex-1 text-left">{g.label}</span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", offen && "rotate-180")} />
                </button>
                {offen && (
                  <div className="mt-1 space-y-1 border-l border-white/10 pl-3">
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

      {/* Profil-Fuß (sitzt im dunklen Bereich des Verlaufs) */}
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-2.5 rounded-lg bg-white/5 px-2.5 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-semibold text-white ring-1 ring-inset ring-white/20">
            {initialen(vorname, nachname)}
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[13px] font-medium text-white">
              {vorname} {nachname}
            </p>
            <p className="truncate text-xs text-white/60">{ROLLEN[rolle]}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
