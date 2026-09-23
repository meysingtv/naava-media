import {
  ArrowDownToLine,
  Banknote,
  BarChart3,
  Bell,
  BookMarked,
  BookOpen,
  Building,
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
 * Navigation v5: zehn Bereiche in drei Gruppen, unten Hilfe und
 * Einstellungen. Hat ein Bereich mehrere Seiten, klappt er in der
 * Navigation auf (aktiver Bereich automatisch) – zusätzlich stehen die
 * Seiten als Reiter im Seitenkopf (`bereich-reiter.tsx`).
 *
 * `BEREICHE`, `bereicheFuer` und `aktiverBereich` bleiben die einzige
 * Quelle für Einträge und Rollen-Sichtbarkeit. Alle Adressen sind dieselben
 * wie vorher.
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
  /** Icon des Bereichs in der Navigation. */
  icon: LucideIcon;
  /** Gruppe in der Navigation – Überschrift siehe `GRUPPEN_TITEL`. */
  gruppe: "arbeit" | "betrieb" | "geschaeft" | "fuss";
  items: BereichItem[];
}

/** Überschrift je Gruppe; die erste Gruppe und der Fuß stehen ohne. */
export const GRUPPEN_TITEL: Record<Bereich["gruppe"], string | null> = {
  arbeit: null,
  betrieb: "Betrieb",
  geschaeft: "Verwaltung",
  fuss: null,
};

const ALLE: FahrlehrerRolle[] = ["chef", "fahrlehrer", "buero"];
const CHEF_BUERO: FahrlehrerRolle[] = ["chef", "buero"];
const CHEF_LEHRER: FahrlehrerRolle[] = ["chef", "fahrlehrer"];

export const BEREICHE: Bereich[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    gruppe: "arbeit",
    items: [{ href: "/dashboard", label: "Dashboard", rollen: ALLE, icon: LayoutDashboard }],
  },
  {
    key: "aufgaben",
    label: "Aufgaben",
    icon: CheckSquare,
    gruppe: "arbeit",
    items: [{ href: "/aufgaben", label: "Aufgaben", rollen: ALLE, icon: CheckSquare, badgeKey: "aufgaben" }],
  },
  {
    key: "kalender",
    label: "Kalender",
    icon: CalendarDays,
    gruppe: "arbeit",
    items: [{ href: "/kalender", label: "Kalender", rollen: CHEF_LEHRER, icon: CalendarDays }],
  },
  {
    key: "kommunikation",
    label: "Kommunikation",
    icon: MessageSquare,
    gruppe: "arbeit",
    items: [
      { href: "/kommunikation", label: "Nachrichten", rollen: ALLE, icon: MessageSquare },
      { href: "/erinnerungen", label: "Terminerinnerungen", rollen: ALLE, icon: Bell },
    ],
  },
  {
    key: "schueler",
    label: "Schüler",
    icon: Users,
    gruppe: "betrieb",
    items: [{ href: "/schueler", label: "Schüler", rollen: ALLE, icon: Users }],
  },
  {
    key: "ausbildung",
    label: "Ausbildung",
    icon: GraduationCap,
    gruppe: "betrieb",
    items: [
      { href: "/theorie", label: "Theorie", rollen: ALLE, icon: BookOpen },
      { href: "/kurse", label: "Kurse", rollen: ALLE, icon: GraduationCap },
      { href: "/pruefungen", label: "Prüfungen", rollen: CHEF_LEHRER, icon: ClipboardCheck },
    ],
  },
  {
    key: "team",
    label: "Team",
    icon: Contact,
    gruppe: "betrieb",
    items: [
      { href: "/fahrlehrer", label: "Mitarbeiter", rollen: ["chef"], icon: Contact },
      { href: "/fahrlehrer/rollen", label: "Rollen und Rechte", rollen: ["chef"], icon: ShieldCheck },
    ],
  },
  {
    key: "fahrzeuge",
    label: "Fahrzeuge",
    icon: Car,
    gruppe: "betrieb",
    items: [{ href: "/fahrzeuge", label: "Fahrzeuge", rollen: CHEF_BUERO, icon: Car }],
  },
  {
    key: "finanzen",
    label: "Finanzen",
    icon: Wallet,
    gruppe: "geschaeft",
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
    key: "auswertung",
    label: "Auswertung",
    icon: BarChart3,
    gruppe: "geschaeft",
    items: [
      { href: "/berichte", label: "Berichte", rollen: CHEF_BUERO, icon: BarChart3 },
      { href: "/cockpit", label: "Cockpit", rollen: CHEF_BUERO, icon: Gauge },
    ],
  },
  {
    key: "hilfe",
    label: "Hilfe",
    icon: LifeBuoy,
    gruppe: "fuss",
    items: [{ href: "/hilfe", label: "Hilfe", rollen: ALLE, icon: LifeBuoy }],
  },
  {
    key: "einstellungen",
    label: "Einstellungen",
    icon: Settings,
    gruppe: "fuss",
    items: [{ href: "/einstellungen", label: "Einstellungen", rollen: ["chef"], icon: Settings }],
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

/**
 * Reiter für den Seitenkopf: nur auf den Startseiten eines Bereichs mit
 * mehreren Seiten (nicht auf Detail- oder Formularseiten).
 */
export function bereichsReiter(
  bereiche: Bereich[],
  pathname: string,
): { bereich: Bereich; aktiv: BereichItem } | null {
  const pfad = pathname.replace(/\/+$/, "") || "/";
  for (const b of bereiche) {
    if (b.items.length < 2) continue;
    const aktiv = b.items.find((i) => i.href === pfad);
    if (aktiv) return { bereich: b, aktiv };
  }
  return null;
}

/** Zähler an Navigationseinträgen – nur gesetzt, wenn die Zahl ohne Extrakosten anfällt. */
export type Zaehler = Partial<Record<NonNullable<BereichItem["badgeKey"]>, number>>;

/** Summe der Zähler aller Seiten eines Bereichs (z. B. überfällige Rechnungen → Finanzen). */
export function bereichsZaehler(b: Bereich, zaehler?: Zaehler): number | undefined {
  let summe = 0;
  let gefunden = false;
  for (const i of b.items) {
    if (i.badgeKey && zaehler?.[i.badgeKey] != null) {
      summe += zaehler[i.badgeKey] ?? 0;
      gefunden = true;
    }
  }
  return gefunden && summe > 0 ? summe : undefined;
}

/** Überfällige Rechnungen zählen rot, alles andere neutral. */
export function zaehlerTon(badgeKey?: BereichItem["badgeKey"]): "neutral" | "danger" {
  return badgeKey === "rechnungen_ueberfaellig" ? "danger" : "neutral";
}
