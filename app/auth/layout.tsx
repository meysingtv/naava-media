import Link from "next/link";
import { CalendarDays, ReceiptText, Smartphone } from "lucide-react";

import { Logo } from "@/components/shared/logo";

const VORTEILE = [
  {
    icon: CalendarDays,
    titel: "Kalender und Disposition",
    text: "Fahrstunden per Ziehen planen – Fahrlehrer und Fahrzeuge immer im Blick.",
  },
  {
    icon: ReceiptText,
    titel: "Rechnungen und Buchhaltung",
    text: "Rechnungen schreiben, mahnen, per Lastschrift einziehen und für DATEV exportieren.",
  },
  {
    icon: Smartphone,
    titel: "Portal für Schüler",
    text: "Termine, Ausbildungsstand und Rechnungen – deine Schüler sehen alles selbst.",
  },
];

const TERMINE = [
  { zeit: "08:00", name: "Lena Hoffmann", art: "Übungsstunde", farbe: "#3565E8", breite: "72%" },
  { zeit: "09:30", name: "Jonas Weber", art: "Überlandfahrt", farbe: "#0E9A77", breite: "88%" },
  { zeit: "11:00", name: "Mia Schäfer", art: "Autobahnfahrt", farbe: "#7650E0", breite: "64%" },
];

/**
 * Anmeldung und Registrierung: links das Formular auf Weiß, rechts (ab
 * Laptop-Breite) eine Markenfläche mit den wichtigsten Funktionen.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="flex min-h-screen flex-col px-6 py-6 sm:px-10">
        <header>
          <Link href="/" aria-label="Zur Startseite" className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Logo />
          </Link>
        </header>
        <main className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-[380px] animate-page-in">{children}</div>
        </main>
        <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground-tertiary">
          <span>© {new Date().getFullYear()} FahrschulApp</span>
          <Link href="/impressum" className="hover:text-foreground">
            Impressum
          </Link>
          <Link href="/datenschutz" className="hover:text-foreground">
            Datenschutz
          </Link>
        </footer>
      </div>

      <aside
        aria-hidden="true"
        className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-center"
        style={{ background: "linear-gradient(150deg, #2f5de8 0%, #2447c9 45%, #1a3494 100%)" }}
      >
        {/* Fahrbahn-Linien als leises Muster */}
        <svg className="absolute inset-0 h-full w-full opacity-[0.08]" preserveAspectRatio="none" viewBox="0 0 600 900">
          {[90, 230, 370, 510].map((x, i) => (
            <line key={x} x1={x} y1="0" x2={x + (i % 2 ? -60 : 60)} y2="900" stroke="white" strokeWidth={i % 2 ? 2 : 6} strokeDasharray={i % 2 ? "28 22" : undefined} />
          ))}
        </svg>

        <div className="relative mx-auto w-full max-w-[520px] px-12">
          <h2 className="text-[30px] font-semibold leading-[38px] tracking-[-0.02em] text-white">Die Verwaltung für deine Fahrschule.</h2>
          <p className="mt-3 text-[15px] leading-6 text-white/75">Schüler, Termine, Rechnungen und Team an einem Ort.</p>

          <ul className="mt-10 space-y-6">
            {VORTEILE.map((v) => (
              <li key={v.titel} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-inset ring-white/20">
                  <v.icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-white">{v.titel}</span>
                  <span className="mt-0.5 block text-13 leading-5 text-white/70">{v.text}</span>
                </span>
              </li>
            ))}
          </ul>

          {/* Kleine Vorschau eines Tagesplans */}
          <div className="mt-12 rounded-2xl bg-white p-5 shadow-[0_24px_48px_-16px_rgba(10,20,60,0.45)]">
            <div className="flex items-center justify-between">
              <p className="text-13 font-semibold text-[#111827]">Heute</p>
              <p className="text-xs text-[#6b7280]">7 Fahrstunden · 5,3 Std.</p>
            </div>
            <ul className="mt-4 space-y-2.5">
              {TERMINE.map((t) => (
                <li key={t.zeit} className="flex items-center gap-3">
                  <span className="w-10 shrink-0 text-xs tabular-nums text-[#6b7280]">{t.zeit}</span>
                  <span
                    className="flex h-9 items-center rounded-md px-3 text-xs"
                    style={{ width: t.breite, background: `${t.farbe}1F`, boxShadow: `inset 3px 0 0 ${t.farbe}` }}
                  >
                    <span className="font-semibold text-[#111827]">{t.name}</span>
                    <span className="ml-2 truncate text-[#4b5563]">{t.art}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>
    </div>
  );
}
