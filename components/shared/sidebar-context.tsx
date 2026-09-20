"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { TooltipProvider } from "@/components/ui/tooltip";

interface SidebarKontext {
  /** Desktop: Sidebar auf 68 px eingeklappt. */
  collapsed: boolean;
  umschalten: () => void;
  /** Mobil: Off-Canvas-Drawer offen. */
  drawerOffen: boolean;
  setDrawerOffen: (o: boolean) => void;
  /** Kommandopalette (⌘K). */
  paletteOffen: boolean;
  setPaletteOffen: (o: boolean) => void;
  /** KI-Assistent (⌘J). */
  assistentOffen: boolean;
  setAssistentOffen: (o: boolean) => void;
}

const Kontext = React.createContext<SidebarKontext | null>(null);

export function useSidebar(): SidebarKontext {
  const ctx = React.useContext(Kontext);
  if (!ctx) throw new Error("useSidebar muss innerhalb von SidebarProvider verwendet werden.");
  return ctx;
}

const SPEICHER_SCHLUESSEL = "fsapp.sidebar";

/**
 * Zustand der Shell an einer Stelle: Einklappen, Mobil-Drawer, Palette und
 * Assistent. Die BREITE kommt ausschließlich aus CSS
 * (`html[data-sidebar="collapsed"]`), gesetzt vom Inline-Script vor dem
 * ersten Paint – React liest sie nur, schreibt sie nie beim Mounten. So
 * flackert nichts und die Hydrierung bleibt stabil.
 *
 * Hier sitzt auch der EINZIGE globale Tastatur-Listener: ⌘K, ⌘B, ⌘J.
 */
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [drawerOffen, setDrawerOffen] = React.useState(false);
  const [paletteOffen, setPaletteOffen] = React.useState(false);
  const [assistentOffen, setAssistentOffen] = React.useState(false);
  const pathname = usePathname();

  // Gespeicherten Zustand nur SPIEGELN (für Tooltips und aria).
  React.useLayoutEffect(() => {
    setCollapsed(document.documentElement.dataset.sidebar === "collapsed");
  }, []);

  const umschalten = React.useCallback(() => {
    setCollapsed((vorher) => {
      const neu = !vorher;
      if (neu) document.documentElement.dataset.sidebar = "collapsed";
      else delete document.documentElement.dataset.sidebar;
      try {
        window.localStorage.setItem(SPEICHER_SCHLUESSEL, neu ? "collapsed" : "open");
      } catch {
        /* kein Speicher verfügbar – dann gilt „offen" beim nächsten Laden */
      }
      return neu;
    });
  }, []);

  // Drawer schließt bei jedem Routenwechsel.
  React.useEffect(() => {
    setDrawerOffen(false);
  }, [pathname]);

  // Der eine globale Kürzel-Listener.
  React.useEffect(() => {
    function beiTaste(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return;
      const taste = e.key.toLowerCase();
      if (taste === "k") {
        e.preventDefault();
        setPaletteOffen((o) => !o);
      } else if (taste === "b") {
        e.preventDefault();
        umschalten();
      } else if (taste === "j") {
        e.preventDefault();
        setAssistentOffen((o) => !o);
      }
    }
    document.addEventListener("keydown", beiTaste);
    return () => document.removeEventListener("keydown", beiTaste);
  }, [umschalten]);

  // Zwei Sheets gleichzeitig sind nicht erlaubt: der Assistent schließt den Drawer.
  const oeffneAssistent = React.useCallback((o: boolean) => {
    setAssistentOffen(o);
    if (o) setDrawerOffen(false);
  }, []);

  const wert = React.useMemo(
    () => ({
      collapsed,
      umschalten,
      drawerOffen,
      setDrawerOffen,
      paletteOffen,
      setPaletteOffen,
      assistentOffen,
      setAssistentOffen: oeffneAssistent,
    }),
    [collapsed, umschalten, drawerOffen, paletteOffen, assistentOffen, oeffneAssistent],
  );

  return (
    <Kontext.Provider value={wert}>
      <TooltipProvider>{children}</TooltipProvider>
    </Kontext.Provider>
  );
}
