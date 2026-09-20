import { Bell, Gauge, Sparkles, Wand2 } from "lucide-react";

import { Btn, Check, Container, cn } from "@/components/ui";
import { SectionHead } from "@/components/bits";
import { ChatMock } from "@/components/mockups";

const CARDS = [
  {
    icon: Bell,
    tag: "Spart Geld",
    t: "No-Show-Killer",
    d: "Automatische Erinnerungen per WhatsApp, SMS und E-Mail – mit Zusage- und Absage-Link. Weniger leere Sitze, weniger Nachtelefonieren.",
    color: "bg-orange",
  },
  {
    icon: Wand2,
    tag: "Spart Zeit",
    t: "Smart-Disposition",
    d: "Die nächste sinnvolle Fahrstunde auf einen Klick – inklusive freiem Slot, passendem Fahrlehrer und Fahrzeug.",
    color: "bg-purple",
  },
  {
    icon: Gauge,
    tag: "Voller Überblick",
    t: "Chef-Cockpit",
    d: "Die wichtigsten Zahlen, bevor du danach suchen musst: Auslastung, Ausfälle, offene Posten nach Alter.",
    color: "bg-sky",
  },
];

export function Highlights() {
  return (
    <section id="highlights" className="relative overflow-hidden bg-dark py-20 text-white md:py-28">
      <div className="pointer-events-none absolute -left-40 top-10 h-[520px] w-[520px] rounded-full bg-brand/25 blur-3xl" aria-hidden />
      <Container className="relative">
        <SectionHead
          center
          light
          eyebrow="Das hat sonst keiner"
          title="Vier Dinge, die deine Fahrschule spürbar entspannter machen."
          sub="Funktionen, die andere Fahrschul-Programme so nicht haben – und die im Alltag Zeit und Geld sparen."
        />

        <div className="mt-14 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
          <div data-reveal className="grid gap-8 rounded-[28px] border border-white/10 bg-white/5 p-7 md:grid-cols-[1fr_1.1fr] md:p-9">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-brand px-3 py-1 text-[12px] font-extrabold uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" /> Neu
              </span>
              <h3 className="mt-4 text-[clamp(26px,3vw,36px)] font-extrabold leading-[1.08] tracking-[-0.02em]">KI-Assistent: Sag einfach, was passieren soll.</h3>
              <p className="mt-4 text-[15.5px] leading-relaxed text-white/70">
                Der Assistent kennt den Kontext deiner Fahrschule und schlägt passende Aktionen vor – vom Termin planen bis zur Rechnung.
                Ausgeführt wird erst, wenn du bestätigst.
              </p>
              <ul className="mt-5 grid gap-2.5">
                <Check light>Termine planen, verschieben, absagen</Check>
                <Check light>Rechnungen und Erinnerungen anstoßen</Check>
                <Check light>Fragen zur Auslastung und zu Schülern</Check>
              </ul>
            </div>
            <div className="overflow-hidden rounded-2xl bg-white text-ink shadow-lift">
              <ChatMock />
            </div>
          </div>

          <div className="grid gap-5">
            {CARDS.map((c, i) => (
              <div key={c.t} data-reveal data-delay={`${i * 70}ms`} className="flex gap-5 rounded-[24px] border border-white/10 bg-white/5 p-6">
                <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white", c.color)}>
                  <c.icon className="h-[22px] w-[22px]" />
                </span>
                <div>
                  <span className="text-[11.5px] font-extrabold uppercase tracking-[0.14em] text-brand-accent">{c.tag}</span>
                  <h3 className="mt-1 text-[20px] font-extrabold">{c.t}</h3>
                  <p className="mt-1.5 text-[14.5px] leading-relaxed text-white/65">{c.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
          <Btn href="/demo" size="lg" arrow>
            Demo anfordern
          </Btn>
          <Btn href="/funktionen" variant="outline" size="lg">
            Alle Funktionen
          </Btn>
        </div>
      </Container>
    </section>
  );
}
