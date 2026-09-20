"use client";

import { AssistentWidget } from "@/components/shared/assistent-widget";
import { CommandPalette } from "@/components/shared/command-palette";
import { useSidebar } from "@/components/shared/sidebar-context";
import type { FahrlehrerRolle } from "@/lib/types";

/**
 * Die beiden Overlays der Shell hängen genau EINMAL im Baum – Sidebar und
 * Mobil-Drawer lösen sie über den gemeinsamen Zustand aus. So gibt es keine
 * doppelten Dialoge und `Esc` schließt immer genau eine Ebene.
 */
export function ShellOverlays({ rolle }: { rolle: FahrlehrerRolle }) {
  const { paletteOffen, setPaletteOffen, assistentOffen, setAssistentOffen } = useSidebar();

  return (
    <>
      <CommandPalette open={paletteOffen} onOpenChange={setPaletteOffen} rolle={rolle} />
      <AssistentWidget open={assistentOffen} onOpenChange={setAssistentOffen} />
    </>
  );
}
