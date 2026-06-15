"use client";

import { Sidebar } from "@/components/shared/sidebar";
import { DesktopTopbar } from "@/components/shared/desktop-topbar";
import { MobileTopbar } from "@/components/shared/mobile-topbar";
import type { FahrlehrerRolle } from "@/lib/types";

interface DashboardShellProps {
  fahrschuleName: string;
  ort: string | null;
  logoUrl: string | null;
  vorname: string;
  nachname: string;
  rolle: FahrlehrerRolle;
  email: string | null;
  children: React.ReactNode;
}

export function DashboardShell({
  fahrschuleName,
  ort,
  logoUrl,
  vorname,
  nachname,
  rolle,
  email,
  children,
}: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <MobileTopbar
        fahrschuleName={fahrschuleName}
        vorname={vorname}
        nachname={nachname}
        rolle={rolle}
      />
      <DesktopTopbar
        fahrschuleName={fahrschuleName}
        ort={ort}
        logoUrl={logoUrl}
        vorname={vorname}
        nachname={nachname}
        rolle={rolle}
        email={email}
      />

      <div className="flex">
        <Sidebar rolle={rolle} />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 print:!p-0">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
