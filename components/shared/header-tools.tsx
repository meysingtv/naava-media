"use client";

import { GlobalSearch } from "@/components/shared/global-search";
import { NeuMenu } from "@/components/shared/neu-menu";

/**
 * Die app-weiten Werkzeuge rechts in der Kopfzeile: Suche (⌘K) und „Neu".
 * Beide lagen in v3.0 in der Sidebar – die trägt jetzt nur noch Navigation.
 *
 * Die Rolle kommt aus dem Shell-Kontext, damit der Seitenkopf eine
 * Server-Komponente bleiben kann.
 */
export function HeaderTools() {
  return (
    <>
      <GlobalSearch />
      <NeuMenu />
    </>
  );
}
