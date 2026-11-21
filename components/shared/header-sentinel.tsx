"use client";

import { useEffect } from "react";

/**
 * Scrolltrennlinie an der App-Leiste: Sobald die Seite gescrollt ist,
 * bekommt die klebende Leiste `data-scrolled="true"` und damit ihre Kante.
 * Kein `backdrop-blur`, keine Transparenz.
 *
 * Die Komponente rendert bewusst NICHTS – so belegt sie in `space-y`-
 * Containern keinen eigenen Platz.
 */
export function HeaderSentinel() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>("[data-app-bar]");
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
