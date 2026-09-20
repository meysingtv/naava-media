import Image from "next/image";

import { Arrow, Btn, Container, Eyebrow, TextLink } from "@/components/ui";
import { RouteMark } from "@/components/home/marks";

export function Hero() {
  return (
    <section className="grain relative overflow-hidden bg-cream">
      <RouteMark className="text-mint/15" />
      <Container wide className="relative z-[2]">
        {/* Kopfzeile wie im Heft */}
        <div className="flex items-center justify-between gap-4 border-b border-line py-4 font-mono text-[11.5px] uppercase tracking-[0.16em] text-muted">
          <span>Software für Fahrschulen</span>
          <span className="hidden sm:inline">Ausgabe 2026 · Deutschland</span>
          <span className="tnum">№ 01 — Start</span>
        </div>

        <div className="grid gap-12 pb-16 pt-12 md:grid-cols-12 md:gap-8 md:pb-24 md:pt-16">
          <div className="flex flex-col justify-center md:col-span-7">
            <h1 className="font-display text-[clamp(46px,7.3vw,110px)] font-medium leading-[0.94] tracking-[-0.025em] text-ink text-balance">
              Für Fahrschulen, die lieber <em className="font-normal italic text-mint">fahren</em> als verwalten.
            </h1>
            <p className="mt-8 max-w-[44ch] text-[18px] leading-[1.55] text-ink/75 md:text-[20px]">
              FahrschulApp legt Disposition, Schülerakte, Finanzen und Kommunikation in ein ruhiges System. Damit der Tag im Auto
              stattfindet – nicht am Schreibtisch.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
              <Btn href="/demo" size="lg" arrow>
                Demo anfordern
              </Btn>
              <TextLink href="/funktionen">Funktionen ansehen</TextLink>
            </div>
            <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-line pt-6 font-mono text-[11.5px] uppercase tracking-[0.14em] text-muted">
              <div>
                <dt className="text-ink">DSGVO</dt>
                <dd className="mt-1">Server in der EU</dd>
              </div>
              <div>
                <dt className="text-ink">Deutsch</dt>
                <dd className="mt-1">Gemacht & gehostet</dd>
              </div>
              <div>
                <dt className="text-ink">Start</dt>
                <dd className="mt-1">In Minuten</dd>
              </div>
            </dl>
          </div>

          <figure className="relative md:col-span-5" data-reveal>
            <span className="absolute -left-4 top-8 hidden h-20 w-2.5 bg-pylon md:block" aria-hidden />
            <div className="relative aspect-[4/5] overflow-hidden rounded-sm md:-mr-8 md:aspect-[5/6] lg:-mr-12">
              <Image
                src="/images/hero-fahrstunde.jpg"
                alt="Fahrlehrer und Fahrschüler lachen während einer Fahrstunde"
                fill
                priority
                sizes="(max-width: 768px) 100vw, 46vw"
                className="object-cover"
              />
            </div>
            <figcaption className="mt-3 flex items-start justify-between gap-6 font-mono text-[11.5px] leading-relaxed text-muted md:-mr-8 lg:-mr-12">
              <span>Fahrstunde, 09:00 Uhr. Termin gestern Abend per Link bestätigt.</span>
              <span className="tnum shrink-0">Abb. 01</span>
            </figcaption>
          </figure>
        </div>
      </Container>
    </section>
  );
}

const TICKER = [
  "Disposition",
  "Schülerakte",
  "Finanzen",
  "Theorie & Prüfungen",
  "Schüler-App",
  "Chef-Cockpit",
  "KI-Assistent",
  "No-Show-Killer",
  "Smart-Disposition",
];

/** Laufband – Rubriken wie auf einem Titelblatt. */
export function Ticker() {
  const row = [...TICKER, ...TICKER];
  return (
    <div className="ticker overflow-hidden border-y border-line bg-cream" aria-hidden>
      <div className="ticker-track py-3.5 font-mono text-[12px] uppercase tracking-[0.18em] text-ink/70">
        {row.map((t, i) => (
          <span key={i} className="flex items-center gap-6 pr-6">
            <span>{t}</span>
            <span className="h-[6px] w-[6px] bg-pylon" />
          </span>
        ))}
      </div>
    </div>
  );
}

const CHAPTERS = [
  { n: "01", t: "Der Alltag", href: "#alltag" },
  { n: "02", t: "Das Produkt", href: "#produkt" },
  { n: "03", t: "Was es nur hier gibt", href: "#highlights" },
  { n: "04", t: "Bildstrecke", href: "#bildstrecke" },
  { n: "05", t: "In vier Schritten", href: "#ablauf" },
  { n: "06", t: "Vertrauen", href: "#sicherheit" },
  { n: "07", t: "Wirkung", href: "#wirkung" },
  { n: "08", t: "Fragen", href: "#faq" },
];

/** Inhaltsverzeichnis – die Seite liest sich wie ein Heft. */
export function Inhalt() {
  return (
    <section className="bg-cream">
      <Container wide className="grid gap-10 py-14 md:grid-cols-12 md:gap-8 md:py-20">
        <div className="md:col-span-4">
          <Eyebrow>Inhalt</Eyebrow>
          <p className="mt-5 max-w-[26ch] font-display text-[clamp(24px,2.6vw,34px)] leading-[1.15] text-ink">
            Eine Software, erklärt wie ein gutes Heft: der Reihe nach, mit Bildern, ohne Blabla.
          </p>
        </div>
        <ol className="grid gap-x-10 md:col-span-8 sm:grid-cols-2">
          {CHAPTERS.map((c) => (
            <li key={c.n} className="border-t border-line">
              <a href={c.href} className="group flex items-baseline gap-5 py-4 text-ink transition-colors hover:text-mint">
                <span className="tnum font-mono text-[12px] text-pylon">{c.n}</span>
                <span className="font-display text-[22px] leading-tight">{c.t}</span>
                <Arrow className="ml-auto shrink-0 self-center opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
              </a>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
