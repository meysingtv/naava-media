import Link from "next/link";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/shared/global-search";
import { HeaderSentinel } from "@/components/shared/header-sentinel";
import { MobileMenuButton } from "@/components/shared/mobile-menu-button";
import { NeuMenu } from "@/components/shared/neu-menu";

/**
 * App-Leiste: die EINE Zeile, die über allen Seiten steht und beim Scrollen
 * oben bleibt – Suche mittig, „Neu" und Glocke bündig rechts. Sie gehört der
 * Anwendung, nicht der Seite; Titel, Brotkrumen und Seitenaktionen stehen
 * darunter im Seitenkopf (`page-topbar.tsx`).
 *
 * Höhe 56 px = Versatz der klebenden Tabellenköpfe (`stickyHeaderOffset`).
 */
export function AppBar() {
  return (
    <>
      <HeaderSentinel />
      <header
        data-app-bar
        className={[
          "sticky top-0 z-header flex h-14 items-center gap-3",
          "border-b border-transparent bg-background px-4 md:px-6 lg:px-8",
          "data-[scrolled=true]:border-border print:hidden",
        ].join(" ")}
      >
        <MobileMenuButton className="-ml-1.5 shrink-0 lg:hidden" />

        {/* Suche – mittig im FENSTER: der Versatz gleicht die halbe
            Navigationsbreite aus, damit die Mitte auf dem Bildschirm stimmt. */}
        <div className="pointer-events-none absolute inset-x-0 hidden justify-center md:flex lg:translate-x-[calc(var(--sidebar-w)/-2)]">
          <div className="pointer-events-auto w-full max-w-[420px] px-4">
            <GlobalSearch />
          </div>
        </div>

        <div className="relative ml-auto flex shrink-0 items-center gap-2">
          <GlobalSearch variant="icon" className="md:hidden" />
          <NeuMenu />
          <Button asChild variant="ghost" size="icon-sm">
            <Link href="/erinnerungen" aria-label="Erinnerungen">
              <Bell className="!size-[18px]" strokeWidth={1.75} />
            </Link>
          </Button>
        </div>
      </header>
    </>
  );
}
