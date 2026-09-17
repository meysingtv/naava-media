import {
  BarChart3,
  Building2,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type { FahrlehrerRolle } from "@/lib/types";

/**
 * Navigation v2: sechs Arbeitsbereiche mit Kontext-Ebene statt einer
 * langen Sidebar. Rollen steuern die Sichtbarkeit je Eintrag.
 */
export interface BereichItem {
  href: string;
  label: string;
  rollen: FahrlehrerRolle[];
}

export interface Bereich {
  key: string;
  label: string;
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
      { href: "/dashboard", label: "Leitstand", rollen: ALLE },
      { href: "/aufgaben", label: "Aufgaben", rollen: ALLE },
      { href: "/kommunikation", label: "Kommunikation", rollen: ALLE },
    ],
  },
  {
    key: "ausbildung",
    label: "Ausbildung",
    icon: GraduationCap,
    items: [
      { href: "/schueler", label: "Schüler", rollen: ALLE },
      { href: "/fahrlehrer", label: "Fahrlehrer", rollen: ["chef"] },
      { href: "/theorie", label: "Theorie", rollen: ALLE },
      { href: "/kurse", label: "Kurse", rollen: ALLE },
      { href: "/pruefungen", label: "Prüfungen", rollen: CHEF_LEHRER },
    ],
  },
  {
    key: "termine",
    label: "Termine",
    icon: CalendarDays,
    items: [
      { href: "/kalender", label: "Kalender", rollen: CHEF_LEHRER },
      { href: "/erinnerungen", label: "Erinnerungen", rollen: ALLE },
    ],
  },
  {
    key: "finanzen",
    label: "Finanzen",
    icon: Wallet,
    items: [
      { href: "/finanzen", label: "Übersicht", rollen: CHEF_BUERO },
      { href: "/rechnungen", label: "Rechnungen", rollen: CHEF_BUERO },
      { href: "/zahlungen", label: "Zahlungen", rollen: CHEF_BUERO },
      { href: "/rechnungslauf", label: "Rechnungslauf", rollen: CHEF_BUERO },
      { href: "/kostentraeger", label: "Kostenträger", rollen: CHEF_BUERO },
      { href: "/buchhaltung", label: "Buchhaltung", rollen: CHEF_BUERO },
      { href: "/lohn", label: "Lohn", rollen: ["chef"] },
    ],
  },
  {
    key: "betrieb",
    label: "Betrieb",
    icon: Building2,
    items: [
      { href: "/fahrzeuge", label: "Fahrzeuge", rollen: CHEF_BUERO },
      { href: "/fahrlehrer/rollen", label: "Rollen & Rechte", rollen: ["chef"] },
      { href: "/einstellungen", label: "Einstellungen", rollen: ["chef"] },
    ],
  },
  {
    key: "auswertung",
    label: "Auswertung",
    icon: BarChart3,
    items: [
      { href: "/cockpit", label: "Cockpit", rollen: CHEF_BUERO },
      { href: "/berichte", label: "Berichte", rollen: CHEF_BUERO },
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
