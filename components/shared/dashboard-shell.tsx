import { AppBar } from "@/components/shared/app-bar";
import { Sidebar, SidebarDrawer } from "@/components/shared/sidebar";
import { SidebarProvider } from "@/components/shared/sidebar-context";
import { ShellOverlays } from "@/components/shared/shell-overlays";
import type { Zaehler } from "@/components/shared/bereiche";
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
  /** Zähler an Navigationseinträgen – nur, wenn die Zahl ohne Extrakosten vorliegt. */
  zaehler?: Zaehler;
  /** Unbestätigte Fahrstunden der nächsten drei Tage – Punkt an der Glocke. */
  offeneBestaetigungen?: number;
  children: React.ReactNode;
}

/**
 * App-Rahmen v4.1: Navigation links und App-Leiste oben bilden einen weißen
 * Rahmen. Darin liegt die hellgraue Arbeitsfläche mit abgerundeter Ecke
 * oben links; die Inhalte stehen als weiße Karten darauf.
 *
 * Gescrollt wird die SEITE, nicht `main` – dadurch klebt die App-Leiste
 * ohne Sonderfälle, und der Druck bleibt einfach.
 */
export function DashboardShell({ children, zaehler, offeneBestaetigungen, ...kontext }: DashboardShellProps) {
  return (
    <SidebarProvider rolle={kontext.rolle}>
      <a
        href="#inhalt"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-palette focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-13 focus:font-medium focus:shadow-md"
      >
        Zum Inhalt springen
      </a>

      <div className="min-h-dvh bg-background">
        <Sidebar {...kontext} zaehler={zaehler} />
        <SidebarDrawer {...kontext} zaehler={zaehler} />

        <div className="transition-[padding] duration-overlay ease-soft lg:pl-[var(--sidebar-w)] print:pl-0">
          <AppBar
            vorname={kontext.vorname}
            nachname={kontext.nachname}
            rolle={kontext.rolle}
            email={kontext.email}
            offeneBestaetigungen={offeneBestaetigungen ?? 0}
          />
          <main
            id="inhalt"
            tabIndex={-1}
            className="min-h-[calc(100dvh-3.5rem)] w-full bg-canvas px-4 pb-16 pt-6 focus-visible:outline-none md:px-6 md:pt-8 lg:rounded-tl-[20px] lg:px-8 print:!bg-white print:!p-0"
          >
            {children}
          </main>
        </div>
      </div>

      <ShellOverlays rolle={kontext.rolle} />
    </SidebarProvider>
  );
}
