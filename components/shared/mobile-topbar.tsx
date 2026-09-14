"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu } from "lucide-react";

import { navItemsFuer } from "@/components/shared/nav-items";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ROLLEN } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { abmelden } from "@/app/auth/actions";
import type { FahrlehrerRolle } from "@/lib/types";

interface MobileTopbarProps {
  fahrschuleName: string;
  vorname: string;
  nachname: string;
  rolle: FahrlehrerRolle;
}

export function MobileTopbar({ fahrschuleName, vorname, nachname, rolle }: MobileTopbarProps) {
  const pathname = usePathname();
  const items = navItemsFuer(rolle);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background px-4 md:hidden print:hidden">
      <span className="truncate text-sm font-semibold text-foreground">{fahrschuleName}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Menü öffnen">
            <Menu className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>
            <p className="font-medium">{fahrschuleName}</p>
            <p className="text-xs font-normal text-muted-foreground">
              {vorname} {nachname} · {ROLLEN[rolle]}
            </p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {items.map((item) => {
            const aktiv = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <DropdownMenuItem key={item.href} asChild>
                <Link
                  href={item.href}
                  className={cn(
                    "cursor-pointer",
                    aktiv && "bg-primary-soft font-medium text-primary [&_svg]:!text-primary",
                  )}
                >
                  <Icon strokeWidth={1.75} />
                  {item.label}
                </Link>
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <form action={abmelden}>
            <button
              type="submit"
              className="relative flex h-9 w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 text-sm text-destructive outline-none transition-colors duration-fast hover:bg-destructive-soft"
            >
              <LogOut className="h-4 w-4" />
              Abmelden
            </button>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
