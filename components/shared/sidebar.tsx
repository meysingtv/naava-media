"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";

import { Logo } from "@/components/shared/logo";
import { navItemsFuer } from "@/components/shared/nav-items";
import { ROLLEN } from "@/lib/constants";
import { cn, initialen } from "@/lib/utils";
import { abmelden } from "@/app/auth/actions";
import type { FahrlehrerRolle } from "@/lib/types";

interface SidebarProps {
  fahrschuleName: string;
  vorname: string;
  nachname: string;
  rolle: FahrlehrerRolle;
}

export function Sidebar({ fahrschuleName, vorname, nachname, rolle }: SidebarProps) {
  const pathname = usePathname();
  const items = navItemsFuer(rolle);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-card md:flex print:hidden">
      {/* Marke */}
      <div className="flex h-12 items-center border-b px-5">
        <Logo />
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
                  "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  aktiv
                    ? "bg-muted font-semibold text-foreground"
                    : "font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {aktiv && (
                  <span className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-primary" />
                )}
                <Icon className={cn("h-[18px] w-[18px]", aktiv && "text-primary")} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Fahrschule + Nutzer */}
      <div className="border-t p-3">
        <div className="mb-2 rounded-md bg-muted/50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Fahrschule</p>
          <p className="truncate text-sm font-semibold">{fahrschuleName}</p>
        </div>
        <div className="flex items-center gap-3 rounded-md px-2 py-1.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {initialen(vorname, nachname)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {vorname} {nachname}
            </p>
            <p className="truncate text-xs text-muted-foreground">{ROLLEN[rolle]}</p>
          </div>
          <form action={abmelden}>
            <button
              type="submit"
              title="Abmelden"
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
