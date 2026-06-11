import {
  BookOpen,
  Building2,
  Calendar,
  Car,
  FileText,
  LayoutDashboard,
  Settings,
  UserCog,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { FahrlehrerRolle } from "@/lib/types";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  rollen: FahrlehrerRolle[];
}

export interface NavGroup {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

const ALLE: FahrlehrerRolle[] = ["chef", "fahrlehrer", "buero"];

export const NAV_TOP: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, rollen: ALLE },
  { href: "/schueler", label: "Schüler", icon: Users, rollen: ALLE },
  { href: "/kalender", label: "Terminplaner", icon: Calendar, rollen: ["chef", "fahrlehrer"] },
  { href: "/theorie", label: "Theorie", icon: BookOpen, rollen: ALLE },
  { href: "/rechnungen", label: "Rechnungen", icon: FileText, rollen: ["chef", "buero"] },
];

export const NAV_GRUPPEN: NavGroup[] = [
  {
    label: "Unternehmen",
    icon: Building2,
    items: [
      { href: "/fahrlehrer", label: "Benutzer", icon: UserCog, rollen: ["chef"] },
      { href: "/fahrzeuge", label: "Fahrzeuge", icon: Car, rollen: ["chef", "buero"] },
    ],
  },
];

export const NAV_EINSTELLUNGEN: NavItem = {
  href: "/einstellungen",
  label: "Einstellungen",
  icon: Settings,
  rollen: ["chef"],
};

// Flache Liste aller Punkte – für Topbar-Label und Mobile-Menü.
export const NAV_ITEMS: NavItem[] = [
  ...NAV_TOP,
  ...NAV_GRUPPEN.flatMap((g) => g.items),
  NAV_EINSTELLUNGEN,
];

export function navItemsFuer(rolle: FahrlehrerRolle): NavItem[] {
  return NAV_ITEMS.filter((item) => item.rollen.includes(rolle));
}

export function navTopFuer(rolle: FahrlehrerRolle): NavItem[] {
  return NAV_TOP.filter((i) => i.rollen.includes(rolle));
}

export function navGruppenFuer(rolle: FahrlehrerRolle): NavGroup[] {
  return NAV_GRUPPEN.map((g) => ({
    ...g,
    items: g.items.filter((i) => i.rollen.includes(rolle)),
  })).filter((g) => g.items.length > 0);
}

export function navEinstellungenFuer(rolle: FahrlehrerRolle): NavItem | null {
  return NAV_EINSTELLUNGEN.rollen.includes(rolle) ? NAV_EINSTELLUNGEN : null;
}
