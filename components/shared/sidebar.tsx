"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft } from "lucide-react";

import { navItemsFuer } from "@/components/shared/nav-items";
import { cn } from "@/lib/utils";
import type { FahrlehrerRolle } from "@/lib/types";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  fahrschuleName: string;
  rolle: FahrlehrerRolle;
}

export function Sidebar({ collapsed, onToggle, fahrschuleName, rolle }: SidebarProps) {
  const pathname = usePathname();
  const items = navItemsFuer(rolle);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-card transition-transform duration-200 ease-out md:flex print:hidden",
        collapsed && "-translate-x-full",
      )}
    >
      {/* Marke + Einklappen */}
      <div className="flex h-12 items-center gap-2 border-b px-3">
        <button
          type="button"
          onClick={onToggle}
          title="Navigation einklappen"
          aria-label="Navigation einklappen"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronsLeft className="h-5 w-5" />
        </button>
        <span className="truncate text-sm font-semibold text-foreground">{fahrschuleName}</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Navigation
        </p>
        <div className="space-y-0.5">
          {items.map((item) => {
            const aktiv = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
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
          })}
        </div>
      </nav>
    </aside>
  );
}
