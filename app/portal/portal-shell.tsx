"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, GraduationCap, Home, LogOut, Receipt, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { portalAbmelden } from "./actions";

const NAV = [
  { href: "/portal", label: "Start", icon: Home },
  { href: "/portal/termine", label: "Termine", icon: CalendarDays },
  { href: "/portal/rechnungen", label: "Rechnungen", icon: Receipt },
  { href: "/portal/fortschritt", label: "Fortschritt", icon: TrendingUp },
];

export function PortalShell({
  schuleName,
  children,
}: {
  schuleName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const aktiv = (href: string) => (href === "/portal" ? pathname === href : pathname.startsWith(href));

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col bg-background">
      {/* Kopf */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/95 px-4">
        <span className="flex items-center gap-2 font-semibold text-foreground">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-4 w-4" />
          </span>
          <span className="truncate">{schuleName}</span>
        </span>
        <form action={portalAbmelden}>
          <button
            type="submit"
            aria-label="Abmelden"
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
        </form>
      </header>

      {/* Inhalt */}
      <main className="flex-1 px-4 pb-24 pt-5">{children}</main>

      {/* Untere Navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg border-t bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="flex items-stretch justify-around">
          {NAV.map((n) => {
            const Icon = n.icon;
            const a = aktiv(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
                  a ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-[22px] w-[22px]" strokeWidth={a ? 2.2 : 1.75} />
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
