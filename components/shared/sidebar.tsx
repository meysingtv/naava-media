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

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  fahrschuleName: string;
  logoUrl: string | null;
  rolle: FahrlehrerRolle;
}

/** Lenkrad-Icon (SVG) – Marke oben links, dreht sich beim Klick. */
function LenkradIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9.5" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M9.4 12H2.6" />
      <path d="M21.4 12H14.6" />
      <path d="M12 14.6V21.4" />
    </svg>
  );
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
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        aktiv
          ? "bg-primary/10 font-medium text-primary"
          : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="h-[18px] w-[18px]" />
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
  const [drehung, setDrehung] = useState(0);

  const toggleGruppe = (label: string) =>
    setManuell((prev) => {
      const n = new Set(prev);
      if (n.has(label)) n.delete(label);
      else n.add(label);
      return n;
    });

  const handleLenkrad = () => {
    setDrehung((d) => d + 360);
    onToggle();
  };

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-card transition-transform duration-200 ease-out md:flex print:hidden",
        collapsed && "-translate-x-full",
      )}
    >
      <div className="flex h-12 items-center gap-2 border-b px-3">
        <button
          type="button"
          onClick={handleLenkrad}
          title="Navigation ein-/ausklappen"
          aria-label="Navigation ein-/ausklappen"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10"
        >
          <LenkradIcon
            className="h-6 w-6"
            style={{
              transform: `rotate(${drehung}deg)`,
              transition: "transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          />
        </button>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={fahrschuleName} className="h-7 max-w-[150px] object-contain" />
        ) : (
          <span className="truncate text-sm font-semibold text-foreground">{fahrschuleName}</span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
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
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Icon className="h-[18px] w-[18px]" />
                  <span className="flex-1 text-left">{g.label}</span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", offen && "rotate-180")} />
                </button>
                {offen && (
                  <div className="mt-0.5 space-y-0.5 border-l border-border pl-3">
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
