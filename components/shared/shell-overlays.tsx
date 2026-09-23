"use client";

import { AssistentWidget } from "@/components/shared/assistent-widget";
import { useSidebar } from "@/components/shared/sidebar-context";

/**
 * Der Assistent hängt genau EINMAL im Baum – Navigation und Mobil-Drawer
 * lösen ihn über den gemeinsamen Zustand aus. Die Suche sitzt als Feld in
 * der App-Leiste (`global-search.tsx`).
 */
export function ShellOverlays() {
  const { assistentOffen, setAssistentOffen } = useSidebar();
  return <AssistentWidget open={assistentOffen} onOpenChange={setAssistentOffen} />;
}
