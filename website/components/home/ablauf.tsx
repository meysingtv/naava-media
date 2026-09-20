import Image from "next/image";
import { CalendarCheck, Database, Rocket, Settings2 } from "lucide-react";

import { Btn, Check, Container, TextLink } from "@/components/ui";
import { SectionHead } from "@/components/bits";

const STEPS = [
  { icon: CalendarCheck, n: "1", t: "Demo ansehen", d: "Wir zeigen dir FahrschulApp anhand deines Alltags – nicht anhand einer Folie." },
  { icon: Settings2, n: "2", t: "Fahrschule einrichten", d: "Zugänge, Fahrlehrer und Fahrzeuge anlegen. Das dauert Minuten, keine Wochen." },
  { icon: Database, n: "3", t: "Daten übernehmen", d: "Bestehende Schüler und Termine ziehen wir gemeinsam mit dir um." },
  { icon: Rocket, n: "4", t: "Loslegen", d: "Planen, abrechnen, Kopf frei haben. Der Support bleibt persönlich." },
];

export function Ablauf() {
  return (
    <section id="ablauf" className="bg-paper py-20 md:py-24">
      <Container>
        <SectionHead center eyebrow="So läuft der Umstieg" title="In vier Schritten im Betrieb." sub="Kein Projekt, kein Berater-Marathon. Du bekommst einen festen Ansprechpartner – und eine Fahrschule, die nach dem Umstieg leiser läuft." />
        <ol className="relative mt-14 grid gap-6 md:grid-cols-4">
          <span className="pointer-events-none absolute left-0 right-0 top-9 hidden h-0.5 bg-line2 md:block" aria-hidden />
          {STEPS.map((s, i) => (
            <li key={s.n} data-reveal data-delay={`${i * 70}ms`} className="relative rounded-3xl bg-white p-6 shadow-card">
              <span className="absolute -top-0 left-6 grid h-[72px] w-[72px] -translate-y-1/2 place-items-center rounded-full border-4 border-paper bg-orange text-white shadow-cta">
                <s.icon className="h-7 w-7" />
              </span>
              <span className="tnum block pt-8 text-[13px] font-extrabold uppercase tracking-[0.14em] text-orange">Schritt {s.n}</span>
              <h3 className="mt-2 text-[21px] font-extrabold tracking-tight">{s.t}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{s.d}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-5">
          <Btn href="/demo" size="lg" arrow>
            Demo anfordern
          </Btn>
          <TextLink href="/funktionen">Alle Funktionen im Detail</TextLink>
        </div>
      </Container>
    </section>
  );
}

const STATS = [
  { v: "−30 %", l: "Terminausfälle", d: "durch Erinnerungen mit Zu- und Absage-Link" },
  { v: "5 → 1", l: "Kanäle", d: "Telefon, Excel, Papier, Chat und Kalender werden ein System" },
  { v: "0", l: "Papierakten", d: "digitale Schülerakte inkl. Ausbildungsnachweis" },
  { v: "100 %", l: "Überblick", d: "Termine, Auslastung und offene Posten auf einen Blick" },
];

export function Wirkung() {
  return (
    <section id="wirkung" className="relative overflow-hidden bg-brand py-20 text-white md:py-24">
      <Image src="/images/kurve.jpg" alt="" aria-hidden fill sizes="100vw" className="object-cover opacity-20 mix-blend-luminosity" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-brand via-brand/90 to-brand-dark" aria-hidden />
      <Container className="relative">
        <SectionHead center light eyebrow="Was sich ändert" title="Wenn das Büro kleiner wird, wird die Fahrschule größer." />
        <dl className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <div key={s.l} data-reveal data-delay={`${i * 60}ms`} className="rounded-3xl bg-white/10 p-6 backdrop-blur">
              <dd className="tnum text-[clamp(40px,4.6vw,60px)] font-extrabold leading-none tracking-[-0.03em]">{s.v}</dd>
              <dt className="mt-3 text-[16px] font-extrabold">{s.l}</dt>
              <dd className="mt-1 text-[14px] leading-relaxed text-white/75">{s.d}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-center text-[12.5px] text-white/60">Beispielhafte Wirkung – keine veröffentlichten Kundendaten.</p>
      </Container>
    </section>
  );
}

/** Ehrlicher Ersatz für erfundene Kundenstimmen: Pilotphase + Gründer-Nähe. */
export function Pilot() {
  return (
    <section className="py-20 md:py-24">
      <Container className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
        <div data-reveal>
          <SectionHead
            eyebrow="Pilotphase"
            title="Wir suchen Fahrschulen, die mit uns bauen."
            sub="FahrschulApp ist neu. Die ersten Fahrschulen arbeiten gerade damit – und ihre Wünsche fließen direkt in die Entwicklung. Echte Kundenstimmen erscheinen hier, sobald sie da sind: mit Namen, Fahrschule und Ort."
          />
          <ul className="mt-7 grid gap-3">
            <Check>Persönliche Einrichtung und Datenübernahme</Check>
            <Check>Direkter Draht zum Gründer – keine Warteschleife</Check>
            <Check>Deine Wünsche landen auf der Roadmap, nicht im Ticket-System</Check>
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Btn href="/demo" size="lg" arrow>
              Pilot-Fahrschule werden
            </Btn>
            <Btn href="/ueber-uns" variant="ghost" size="lg">
              Wer dahinter steht
            </Btn>
          </div>
        </div>
        <div data-reveal data-delay="90ms" className="relative">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] shadow-lift">
            <Image src="/images/fahrlehrerin.jpg" alt="Fahrlehrer erklärt einer Fahrschülerin das Fahrzeug" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
          </div>
          <div className="absolute -bottom-6 -left-4 rounded-2xl bg-white p-4 shadow-lift sm:-left-8">
            <div className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-orange">Gründer-geführt</div>
            <div className="mt-1 text-[15px] font-bold text-ink">Aus der Praxis gedacht, in Deutschland gebaut.</div>
          </div>
        </div>
      </Container>
    </section>
  );
}
