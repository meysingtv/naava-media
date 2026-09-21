"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { PanelLeftClose, PanelLeftOpen, Sparkles, X } from "lucide-react";

import { FahrschulSwitcher } from "@/components/shared/fahrschul-switcher";
import { NutzerMenu } from "@/components/shared/nutzer-menu";
import { SidebarButton } from "@/components/shared/sidebar-item";
import { SidebarNav } from "@/components/shared/sidebar-nav";
import { useSidebar } from "@/components/shared/sidebar-context";
import { cn } from "@/lib/utils";
import type { Zaehler } from "@/components/shared/bereiche";
import type { FahrlehrerRolle, FahrschulMitgliedschaft } from "@/lib/types";

export interface SidebarProps {
  fahrschuleName: string;
  ort: string | null;
  logoUrl: string | null;
  vorname: string;
  nachname: string;
  rolle: FahrlehrerRolle;
  email: string | null;
  fahrschulen: FahrschulMitgliedschaft[];
  aktiveFahrschuleId: string | null;
  zaehler?: Zaehler;
}

/**
 * Gemeinsames Innenleben von fester Sidebar und Mobil-Drawer.
 *
 * Die Sidebar trägt ausschließlich NAVIGATION. Suche und „Neu" sitzen in der
 * Kopfzeile der Seite (`page-topbar.tsx` → `header-tools.tsx`).
 */
function SidebarInhalt({ imDrawer, ...props }: SidebarProps & { imDrawer?: boolean }) {
  const { collapsed, umschalten, setAssistentOffen } = useSidebar();

  return (
    <>
      {/* A – Fahrschul-Umschalter */}
      <FahrschulSwitcher
        fahrschuleName={props.fahrschuleName}
        ort={props.ort}
        logoUrl={props.logoUrl}
        rolle={props.rolle}
        fahrschulen={props.fahrschulen}
        aktiveFahrschuleId={props.aktiveFahrschuleId}
        imDrawer={imDrawer}
      />

      {/* B – Navigation */}
      <SidebarNav rolle={props.rolle} zaehler={props.zaehler} imDrawer={imDrawer} />

      {/* C – Fuß */}
      <div className="mt-auto space-y-1 p-3 pt-4">
        <SidebarButton
          icon={Sparkles}
          label="Assistent"
          iconClassName="text-primary"
          onClick={() => setAssistentOffen(true)}
          imDrawer={imDrawer}
        />

        <NutzerMenu
          vorname={props.vorname}
          nachname={props.nachname}
          rolle={props.rolle}
          email={props.email}
          imDrawer={imDrawer}
        />

        {!imDrawer && (
          <SidebarButton
            icon={collapsed ? PanelLeftOpen : PanelLeftClose}
            label={collapsed ? "Ausklappen" : "Einklappen"}
            onClick={umschalten}
            className="hidden text-sidebar-muted lg:flex"
          />
        )}
      </div>
    </>
  );
}

/**
 * Feste Sidebar (≥ 1024 px): 256 px, eingeklappt 68 px. Die Breite kommt
 * ausschließlich aus CSS (`--sidebar-w`), nie aus React-State.
 */
export function Sidebar(props: SidebarProps) {
  return (
    <aside
      aria-label="Hauptnavigation"
      className={cn(
        "sidebar fixed inset-y-0 left-0 z-sidebar hidden w-[var(--sidebar-w)] flex-col",
        "bg-sidebar text-sidebar-foreground",
        "transition-[width] duration-overlay ease-soft lg:flex print:hidden",
      )}
    >
      <SidebarInhalt {...props} />
    </aside>
  );
}

/** Off-Canvas-Drawer (< 1024 px), geöffnet über den Menü-Button im Seitenkopf. */
export function SidebarDrawer(props: SidebarProps) {
  const { drawerOffen, setDrawerOffen } = useSidebar();

  return (
    <DialogPrimitive.Root open={drawerOffen} onOpenChange={setDrawerOffen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-sheet bg-foreground/45 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 lg:hidden" />
        <DialogPrimitive.Content
          className={cn(
            "sidebar fixed inset-y-0 left-0 z-sheet flex w-[288px] max-w-[85vw] flex-col bg-sidebar p-0 text-sidebar-foreground",
            "border-r border-sidebar-border shadow-lg",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-left",
            "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left duration-overlay lg:hidden",
          )}
        >
          <DialogPrimitive.Title className="sr-only">Hauptnavigation</DialogPrimitive.Title>
          <SidebarInhalt {...props} imDrawer />
          <DialogPrimitive.Close
            aria-label="Menü schließen"
            className="absolute right-2 top-2.5 flex h-9 w-9 items-center justify-center rounded-md text-sidebar-muted outline-none transition-colors hover:bg-sidebar-hover hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70"
          >
            <X className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
