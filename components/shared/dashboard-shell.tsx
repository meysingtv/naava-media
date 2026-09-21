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
  /** Zähler an Sidebar-Einträgen – nur, wenn die Zahl ohne Extrakosten vorliegt. */
  zaehler?: Zaehler;
  children: React.ReactNode;
}

/**
 * App-Rahmen v3: feste Navigation links (256 px / eingeklappt 68 px), rechts
 * oben die App-Leiste (Suche, „Neu", Glocke – bleibt beim Scrollen stehen)
 * und darunter der Seiteninhalt mit eigenem Seitenkopf. Keine Bereichs-
 * Leiste, keine Kontext-Tabs, keine Bottom-Bar.
 *
 * Gescrollt wird die SEITE, nicht `main` – dadurch funktionieren
 * `sticky top-0` am Seitenkopf und `sticky top-14` am Tabellenkopf ohne
 * Sonderfälle, und der Druck bleibt einfach.
 */
export function DashboardShell({ children, zaehler, ...kontext }: DashboardShellProps) {
  return (
    <SidebarProvider rolle={kontext.rolle}>
      <a
        href="#inhalt"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-palette focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-13 focus:font-medium focus:shadow-md"
      >
        Zum Inhalt springen
      </a>

      <div className="min-h-dvh bg-canvas">
        <Sidebar {...kontext} zaehler={zaehler} />
        <SidebarDrawer {...kontext} zaehler={zaehler} />

        <div className="transition-[padding] duration-overlay ease-soft lg:pl-[var(--sidebar-w)] print:pl-0">
          <AppBar />
          <main
            id="inhalt"
            tabIndex={-1}
            className="w-full px-4 pb-16 pt-7 focus-visible:outline-none md:px-6 md:pt-8 lg:px-8 print:!p-0"
          >
            {children}
          </main>
        </div>
      </div>

      <ShellOverlays rolle={kontext.rolle} />
    </SidebarProvider>
  );
}
