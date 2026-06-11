"use client";

import { useEffect, useState } from "react";

import { Sidebar } from "@/components/shared/sidebar";
import { DesktopTopbar } from "@/components/shared/desktop-topbar";
import { MobileTopbar } from "@/components/shared/mobile-topbar";
import { cn } from "@/lib/utils";
import type { FahrlehrerRolle } from "@/lib/types";

interface DashboardShellProps {
  fahrschuleName: string;
  logoUrl: string | null;
  vorname: string;
  nachname: string;
  rolle: FahrlehrerRolle;
  children: React.ReactNode;
}

export function DashboardShell({
  fahrschuleName,
  logoUrl,
  vorname,
  nachname,
  rolle,
  children,
}: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [geladen, setGeladen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("naava-sidebar") === "1");
    } catch {
      /* ignorieren */
    }
    setGeladen(true);
  }, []);
  useEffect(() => {
    if (geladen) localStorage.setItem("naava-sidebar", collapsed ? "1" : "0");
  }, [collapsed, geladen]);

  const toggle = () => setCollapsed((c) => !c);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        collapsed={collapsed}
        onToggle={toggle}
        fahrschuleName={fahrschuleName}
        logoUrl={logoUrl}
        rolle={rolle}
      />
      <MobileTopbar
        fahrschuleName={fahrschuleName}
        vorname={vorname}
        nachname={nachname}
        rolle={rolle}
      />
      <div
        className={cn(
          "transition-[padding] duration-200 ease-out print:!pl-0",
          collapsed ? "md:pl-0" : "md:pl-64",
        )}
      >
        <DesktopTopbar
          collapsed={collapsed}
          onToggle={toggle}
          vorname={vorname}
          nachname={nachname}
          rolle={rolle}
        />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 print:!p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
