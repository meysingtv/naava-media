import { AreaNav, MobileAreaBar } from "@/components/shared/area-nav";
import { TopBar } from "@/components/shared/top-bar";
import type { FahrlehrerRolle, FahrschulMitgliedschaft } from "@/lib/types";

interface DashboardShellProps {
  fahrschuleName: string;
  ort: string | null;
  logoUrl: string | null;
  vorname: string;
  nachname: string;
  rolle: FahrlehrerRolle;
  email: string | null;
  fahrschulen: FahrschulMitgliedschaft[];
  aktiveFahrschuleId: string | null;
  children: React.ReactNode;
}

/**
 * App-Rahmen v2: Top-Bar + Bereichs-Navigation oben, Inhalt in voller
 * Breite auf der Arbeitsfläche. Keine Sidebar. Mobil: Bottom-Bar.
 */
export function DashboardShell({
  fahrschuleName,
  ort,
  logoUrl,
  vorname,
  nachname,
  rolle,
  email,
  fahrschulen,
  aktiveFahrschuleId,
  children,
}: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-canvas">
      <TopBar
        fahrschuleName={fahrschuleName}
        ort={ort}
        logoUrl={logoUrl}
        vorname={vorname}
        nachname={nachname}
        rolle={rolle}
        email={email}
        fahrschulen={fahrschulen}
        aktiveFahrschuleId={aktiveFahrschuleId}
      />
      <AreaNav rolle={rolle} />
      <main className="mx-auto w-full max-w-[1440px] px-3 pb-20 pt-4 md:px-5 md:pb-8 md:pt-5 lg:px-8 print:!p-0">
        {children}
      </main>
      <MobileAreaBar rolle={rolle} />
    </div>
  );
}
