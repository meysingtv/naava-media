import type { Metadata } from "next";
import {
  BarChart3,
  Bell,
  CalendarClock,
  Check,
  GraduationCap,
  Smartphone,
  Sparkles,
  Wallet,
  Wand2,
} from "lucide-react";

import { Container, Eyebrow } from "@/components/ui";
import { CtaBand, SectionHead } from "@/components/bits";

export const metadata: Metadata = {
  title: "Funktionen",
  description:
    "Disposition, Schülerverwaltung, Finanzen, Theorie & Prüfungen, Schüler-App und Chef-Cockpit – alle Funktionen von FahrschulApp im Überblick.",
  alternates: { canonical: "/funktionen" },
};

const FEATURES = [
  {
    icon: CalendarClock,
    t: "Disposition",
    d: "Fahrlehrer, Fahrzeuge und Schüler auf einer Zeitachse. Verfügbarkeiten, Prüfungen und Sperrzeiten inklusive.",
    p: ["Ressourcen-Board", "Farbcodierte Termine", "Konflikterkennung"],
  },
  {
    icon: GraduationCap,
    t: "Schülerverwaltung",
    d: "Digitale Ausbildungsakte mit Fortschritt, Dokumenten, Unterlagen-Checkliste und Ausbildungsnachweis.",
    p: ["Fortschritt & Prüfungsreife", "E-Signatur", "Dokumente"],
  },
  {
    icon: Wallet,
    t: "Finanzen",
    d: "Rechnungen, Ratenpläne und Mahnwesen mit SEPA, XRechnung und DATEV. Zahlungsstatus jederzeit klar.",
    p: ["Ratenpläne", "Offene Posten nach Alter", "DATEV-Export"],
  },
  {
    icon: BarChart3,
    t: "Theorie & Prüfungen",
    d: "Theoriefortschritt, Prüfungstermine und offene Voraussetzungen an einem Ort.",
    p: ["Prüfungstermine", "Status & Erinnerungen", "Theorie/Praxis verbunden"],
  },
  {
    icon: Smartphone,
    t: "Schüler-App & Portal",
    d: "Termine, Fortschritt, Zahlungen und Nachrichten in einer App im Design deiner Fahrschule.",
    p: ["Termine bestätigen", "Online bezahlen", "Eigenes Branding"],
  },
  {
    icon: BarChart3,
    t: "Auswertung & Cockpit",
    d: "Live-Auslastung, No-Show-Quote und offene Posten nach Alter – die wichtigsten Zahlen auf einen Blick.",
    p: ["Auslastung je Ressource", "No-Show-Quote", "Frühwarnungen"],
  },
];

const HIGHLIGHTS = [
  { icon: Sparkles, t: "KI-Assistent", d: "Die Fahrschule per Chat steuern." },
  { icon: Bell, t: "No-Show-Killer", d: "Automatische Erinnerungen mit Zusage/Absage." },
  { icon: Wand2, t: "Smart-Disposition", d: "Nächste sinnvolle Fahrstunde auf einen Klick." },
];

export default function FunktionenPage() {
  return (
    <>
      <section className="relative overflow-hidden py-16 md:py-20">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ background: "radial-gradient(45% 40% at 90% 0%, rgba(157,241,200,.35), transparent 65%)" }}
          aria-hidden
        />
        <Container>
          <Eyebrow>Funktionen</Eyebrow>
          <h1 className="mt-5 max-w-3xl font-display text-[clamp(34px,5vw,54px)] font-extrabold leading-[1.0] tracking-[-0.02em] text-ink text-balance">
            Alles, was den Fahrschulalltag leichter macht.
          </h1>
          <p className="mt-5 max-w-[46ch] text-[18px] leading-relaxed text-muted">
            Von der Disposition bis zur Abrechnung – ein System, das zusammenarbeitet, statt gegeneinander.
          </p>
        </Container>
      </section>

      <section className="pb-20">
        <Container>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.t} data-reveal className="rounded-2xl border border-line bg-white p-7 transition-shadow hover:shadow-[0_20px_50px_-30px_rgba(15,45,30,.25)]">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-mint-soft text-mint">
                  <f.icon className="h-6 w-6" />
                </span>
                <h2 className="mt-4 font-display text-[21px] font-bold">{f.t}</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{f.d}</p>
                <ul className="mt-4 grid gap-2">
                  {f.p.map((p) => (
                    <li key={p} className="flex items-center gap-2 text-[14.5px] text-ink/80">
                      <Check className="h-4 w-4 text-mint" strokeWidth={3} /> {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-ink py-16 text-white">
        <Container>
          <SectionHead center eyebrow="Highlights" title={<span className="text-white">Das, was sonst keiner hat</span>} />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {HIGHLIGHTS.map((h) => (
              <div key={h.t} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-mint-accent/15 text-mint-accent">
                  <h.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 font-display text-[19px] font-bold text-white">{h.t}</h3>
                <p className="mt-1.5 text-[14.5px] text-white/60">{h.d}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <CtaBand />
    </>
  );
}
