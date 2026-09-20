import {
  ArrowDownToLine,
  Banknote,
  BarChart3,
  Bell,
  BookMarked,
  BookOpen,
  Building,
  Building2,
  CalendarDays,
  Car,
  CheckSquare,
  ClipboardCheck,
  Contact,
  FileText,
  Gauge,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  MessageSquare,
  Repeat,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type { FahrlehrerRolle } from "@/lib/types";

/**
 * Navigation v3: sechs Gruppen in der linken Sidebar. `BEREICHE`,
 * `bereicheFuer` und `aktiverBereich` bleiben die einzige Quelle für
 * Einträge und Rollen-Sichtbarkeit – die Rollen sind gegenüber v2
 * unverändert.
 */
export interface BereichItem {
  href: string;
  label: string;
  rollen: FahrlehrerRolle[];
  /** Ein Icon je Eintrag – ausschließlich lucide, strokeWidth 1.75. */
  icon: LucideIcon;
  /** Optionaler Zähler-Slot; wird nur gefüllt, wenn die Zahl gratis vorliegt. */
  badgeKey?: "aufgaben" | "rechnungen_ueberfaellig";
}

export interface Bereich {
  key: string;
  label: string;
  /** Gruppen-Icon – bleibt im Typ, wird von der Sidebar nicht gerendert. */
  icon: LucideIcon;
  items: BereichItem[];
}

const ALLE: FahrlehrerRolle[] = ["chef", "fahrlehrer", "buero"];
const CHEF_BUERO: FahrlehrerRolle[] = ["chef", "buero"];
const CHEF_LEHRER: FahrlehrerRolle[] = ["chef", "fahrlehrer"];

export const BEREICHE: Bereich[] = [
  {
    key: "uebersicht",
    label: "Übersicht",
    icon: LayoutDashboard,
    items: [
      { href: "/dashboard", label: "Leitstand", rollen: ALLE, icon: LayoutDashboard },
      { href: "/aufgaben", label: "Aufgaben", rollen: ALLE, icon: CheckSquare, badgeKey: "aufgaben" },
      { href: "/kommunikation", label: "Kommunikation", rollen: ALLE, icon: MessageSquare },
    ],
  },
  {
    key: "ausbildung",
    label: "Ausbildung",
    icon: GraduationCap,
    items: [
      { href: "/schueler", label: "Schüler", rollen: ALLE, icon: Users },
      { href: "/fahrlehrer", label: "Fahrlehrer", rollen: ["chef"], icon: Contact },
      { href: "/theorie", label: "Theorie", rollen: ALLE, icon: BookOpen },
      { href: "/kurse", label: "Kurse", rollen: ALLE, icon: GraduationCap },
      { href: "/pruefungen", label: "Prüfungen", rollen: CHEF_LEHRER, icon: ClipboardCheck },
    ],
  },
  {
    key: "termine",
    label: "Termine",
    icon: CalendarDays,
    items: [
      { href: "/kalender", label: "Kalender", rollen: CHEF_LEHRER, icon: CalendarDays },
      { href: "/erinnerungen", label: "Erinnerungen", rollen: ALLE, icon: Bell },
    ],
  },
  {
    key: "finanzen",
    label: "Finanzen",
    icon: Wallet,
    items: [
      { href: "/finanzen", label: "Übersicht", rollen: CHEF_BUERO, icon: Wallet },
      {
        href: "/rechnungen",
        label: "Rechnungen",
        rollen: CHEF_BUERO,
        icon: FileText,
        badgeKey: "rechnungen_ueberfaellig",
      },
      { href: "/zahlungen", label: "Zahlungen", rollen: CHEF_BUERO, icon: ArrowDownToLine },
      { href: "/rechnungslauf", label: "Rechnungslauf", rollen: CHEF_BUERO, icon: Repeat },
      { href: "/kostentraeger", label: "Kostenträger", rollen: CHEF_BUERO, icon: Building },
      { href: "/buchhaltung", label: "Buchhaltung", rollen: CHEF_BUERO, icon: BookMarked },
      { href: "/lohn", label: "Lohn", rollen: ["chef"], icon: Banknote },
    ],
  },
  {
    key: "betrieb",
    label: "Betrieb",
    icon: Building2,
    items: [
      { href: "/fahrzeuge", label: "Fahrzeuge", rollen: CHEF_BUERO, icon: Car },
      { href: "/fahrlehrer/rollen", label: "Rollen & Rechte", rollen: ["chef"], icon: ShieldCheck },
      { href: "/einstellungen", label: "Einstellungen", rollen: ["chef"], icon: Settings },
      { href: "/hilfe", label: "Hilfe", rollen: ALLE, icon: LifeBuoy },
    ],
  },
  {
    key: "auswertung",
    label: "Auswertung",
    icon: BarChart3,
    items: [
      { href: "/cockpit", label: "Cockpit", rollen: CHEF_BUERO, icon: Gauge },
      { href: "/berichte", label: "Berichte", rollen: CHEF_BUERO, icon: BarChart3 },
    ],
  },
];

/** Bereiche mit nur den Einträgen, die die Rolle sehen darf. */
export function bereicheFuer(rolle: FahrlehrerRolle): Bereich[] {
  return BEREICHE.map((b) => ({ ...b, items: b.items.filter((i) => i.rollen.includes(rolle)) })).filter(
    (b) => b.items.length > 0,
  );
}

/** Aktiver Bereich + Eintrag für einen Pfad (längster Präfix gewinnt). */
export function aktiverBereich(bereiche: Bereich[], pathname: string): { bereich: Bereich | null; item: BereichItem | null } {
  let best: { bereich: Bereich; item: BereichItem } | null = null;
  for (const b of bereiche) {
    for (const i of b.items) {
      const trifft = pathname === i.href || pathname.startsWith(`${i.href}/`);
      if (trifft && (!best || i.href.length > best.item.href.length)) best = { bereich: b, item: i };
    }
  }
  return best ?? { bereich: null, item: null };
}

/** Zähler an Sidebar-Einträgen – nur gesetzt, wenn die Zahl ohne Extrakosten anfällt. */
export type Zaehler = Partial<Record<NonNullable<BereichItem["badgeKey"]>, number>>;
