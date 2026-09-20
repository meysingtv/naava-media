"use client";

import { useEffect } from "react";

/**
 * Scrolltrennlinie am Seitenkopf: Sobald die Seite gescrollt ist, bekommt
 * der klebende Kopf `data-scrolled="true"` und damit seine Kante. Kein
 * `backdrop-blur`, keine Transparenz.
 *
 * Die Komponente rendert bewusst NICHTS – so belegt sie in `space-y`-
 * Containern der Seiten keinen eigenen Platz.
 */
export function HeaderSentinel() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>("[data-page-header]");
    if (!header) return;

    function pruefe() {
      if (!header) return;
      header.dataset.scrolled = window.scrollY > 2 ? "true" : "false";
    }

    pruefe();
    window.addEventListener("scroll", pruefe, { passive: true });
    return () => window.removeEventListener("scroll", pruefe);
  }, []);

  return null;
}
