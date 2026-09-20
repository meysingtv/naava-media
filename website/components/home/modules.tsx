import Link from "next/link";
import { BarChart3, CalendarClock, ClipboardCheck, GraduationCap, Smartphone, Wallet } from "lucide-react";

import { Arrow, Container, cn } from "@/components/ui";
import { SectionHead } from "@/components/bits";

const TILES = [
  { icon: CalendarClock, t: "Disposition", d: "Fahrlehrer, Fahrzeuge und Schüler auf einer Zeitachse – Konflikte erkennt das System.", href: "/#disposition", bg: "bg-brand", fg: "text-white" },
  { icon: GraduationCap, t: "Schülerakte", d: "Fortschritt, Dokumente, Ausbildungsnachweis mit E-Signatur. Papierlos.", href: "/#schuelerakte", bg: "bg-purple", fg: "text-white" },
  { icon: Wallet, t: "Finanzen", d: "Rechnungen, Ratenpläne, Mahnwesen. SEPA, XRechnung und DATEV inklusive.", href: "/#finanzen", bg: "bg-orange", fg: "text-white" },
  { icon: ClipboardCheck, t: "Prüfungen", d: "Prüfungstermine, Status und Erinnerungen an offene Voraussetzungen.", href: "/#pruefungen", bg: "bg-sky", fg: "text-white" },
  { icon: Smartphone, t: "Schüler-App", d: "Termine bestätigen, online bezahlen, Fortschritt sehen – im Design deiner Fahrschule.", href: "/#schueler-app", bg: "bg-yellow", fg: "text-ink" },
  { icon: BarChart3, t: "Chef-Cockpit", d: "Auslastung, No-Show-Quote und offene Posten – live, bevor du danach suchen musst.", href: "/#cockpit", bg: "bg-dark", fg: "text-white" },
];

export function Modules() {
  return (
    <section id="module" className="py-20 md:py-24">
      <Container>
        <SectionHead
          center
          eyebrow="Alles in einer Software"
          title="Sechs Module. Ein System. Kein Chaos."
          sub="Jeder Bereich deiner Fahrschule hat seinen Platz – und alle greifen ineinander. Keine Doppeleingaben, kein Programmwechsel."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TILES.map((t, i) => (
            <Link
              key={t.t}
              href={t.href}
              data-reveal
              data-delay={`${i * 50}ms`}
              className={cn(
                "group relative flex min-h-[250px] flex-col overflow-hidden rounded-3xl p-7 transition-transform duration-200 hover:-translate-y-1",
                t.bg,
                t.fg,
              )}
            >
              <span className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 transition-transform duration-300 group-hover:scale-125" aria-hidden />
              <t.icon className="h-9 w-9" strokeWidth={2} />
              <h3 className="mt-auto font-display text-[40px] font-extrabold uppercase leading-none tracking-[0.01em]">{t.t}</h3>
              <p className="mt-2 text-[15px] leading-snug opacity-90">{t.d}</p>
              <span className="mt-4 inline-flex items-center gap-2 text-[14px] font-bold">
                Mehr erfahren <Arrow className="transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
