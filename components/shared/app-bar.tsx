import { Glocke } from "@/components/shared/glocke";
import { GlobalSearch } from "@/components/shared/global-search";
import { HeaderSentinel } from "@/components/shared/header-sentinel";
import { MobileMenuButton } from "@/components/shared/mobile-menu-button";
import { NeuMenu } from "@/components/shared/neu-menu";
import { NutzerMenu } from "@/components/shared/nutzer-menu";
import { ZuletztReiter } from "@/components/shared/zuletzt-reiter";
import type { FahrlehrerRolle } from "@/lib/types";

/**
 * App-Leiste: die EINE Zeile über allen Seiten, bleibt beim Scrollen oben.
 * Links die zuletzt geöffneten anderen Seiten als Reiter, mittig die Suche,
 * rechts „Neu", die Glocke (mit Zähler für unbestätigte Termine) und das
 * Konto mit Name und Rolle.
 *
 * Höhe 56 px = Versatz der klebenden Tabellenköpfe.
 */
export function AppBar({
  vorname,
  nachname,
  rolle,
  email,
  offeneBestaetigungen,
}: {
  vorname: string;
  nachname: string;
  rolle: FahrlehrerRolle;
  email: string | null;
  offeneBestaetigungen: number;
}) {
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

        {/* Zuletzt geöffnet – endet immer vor der Suche */}
        <ZuletztReiter className="relative z-[1] hidden max-w-[calc(50vw-var(--sidebar-w)-182px)] xl:flex" />

        {/* Suche – mittig im FENSTER: der Versatz gleicht die halbe
            Navigationsbreite aus, damit die Mitte auf dem Bildschirm stimmt. */}
        <div className="pointer-events-none absolute inset-x-0 hidden justify-center md:flex lg:translate-x-[calc(var(--sidebar-w)/-2)]">
          <div className="pointer-events-auto w-full max-w-[332px] px-4">
            <GlobalSearch />
          </div>
        </div>

        <div className="relative ml-auto flex shrink-0 items-center gap-1.5">
          <GlobalSearch variant="icon" className="md:hidden" />
          <NeuMenu />
          <Glocke anzahl={offeneBestaetigungen} />
          <span aria-hidden="true" className="mx-1.5 hidden h-6 w-px bg-border sm:block" />
          <NutzerMenu vorname={vorname} nachname={nachname} rolle={rolle} email={email} />
        </div>
      </header>
    </>
  );
}
