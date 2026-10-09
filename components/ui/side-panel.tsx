"use client";

/**
 * Seitenpanel (Drawer rechts) – deutschsprachige Hülle um `sheet.tsx`,
 * damit Seiten die Detailansicht unter ihrem sprechenden Namen einbinden
 * können. Die Bausteine sind identisch; `sheet.tsx` bleibt die Quelle.
 */
export {
  Sheet as SidePanel,
  SheetTrigger as SidePanelTrigger,
  SheetClose as SidePanelClose,
  SheetContent as SidePanelContent,
  SheetHeader as SidePanelHeader,
  SheetBody as SidePanelBody,
  SheetFooter as SidePanelFooter,
  SheetTitle as SidePanelTitle,
  SheetDescription as SidePanelDescription,
} from "@/components/ui/sheet";

export type { SheetContentProps as SidePanelContentProps } from "@/components/ui/sheet";
