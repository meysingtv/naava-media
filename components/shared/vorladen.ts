"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

/**
 * Vorladen beim Überfahren: Sobald der Mauszeiger auf einem Link steht, er
 * den Tastaturfokus bekommt oder ein Finger aufsetzt, lädt der Router die
 * Seite KOMPLETT vor (inklusive Daten). Bis zum Klick vergehen meist
 * 100–300 ms – die Seite steht dann schon bereit und erscheint sofort.
 *
 * Doppelte Anfragen verhindert der Router selbst; im Entwicklungsmodus
 * macht `router.prefetch` bewusst nichts.
 */
export function useVorladen() {
  const router = useRouter();
  return React.useCallback(
    (href: string) => {
      const los = () => router.prefetch(href);
      return { onMouseEnter: los, onFocus: los, onTouchStart: los };
    },
    [router],
  );
}
