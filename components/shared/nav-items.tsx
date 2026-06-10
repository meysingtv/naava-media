import {
  BookOpen,
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

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, rollen: ["chef", "fahrlehrer", "buero"] },
  { href: "/schueler", label: "Schüler", icon: Users, rollen: ["chef", "fahrlehrer", "buero"] },
  { href: "/kalender", label: "Terminplaner", icon: Calendar, rollen: ["chef", "fahrlehrer"] },
  { href: "/theorie", label: "Theorie", icon: BookOpen, rollen: ["chef", "fahrlehrer", "buero"] },
  { href: "/rechnungen", label: "Rechnungen", icon: FileText, rollen: ["chef", "buero"] },
  { href: "/fahrlehrer", label: "Fahrlehrer", icon: UserCog, rollen: ["chef"] },
  { href: "/fahrzeuge", label: "Fahrzeuge", icon: Car, rollen: ["chef", "buero"] },
  { href: "/einstellungen", label: "Einstellungen", icon: Settings, rollen: ["chef"] },
];

export function navItemsFuer(rolle: FahrlehrerRolle): NavItem[] {
  return NAV_ITEMS.filter((item) => item.rollen.includes(rolle));
}
