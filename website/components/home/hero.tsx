import Image from "next/image";
import { Bell, Cloud, FileCheck2, LayoutGrid, Users2 } from "lucide-react";

import { Btn, Check, Container, cn } from "@/components/ui";
import { DashboardMock, LaptopFrame, PhoneMock } from "@/components/mockups";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-brand text-white">
      <div className="pointer-events-none absolute -right-40 -top-48 h-[620px] w-[620px] rounded-full bg-brand-accent/35 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-52 left-1/4 h-[480px] w-[480px] rounded-full bg-brand-deep/50 blur-3xl" aria-hidden />
      <Container className="relative grid items-center gap-14 pb-28 pt-12 md:grid-cols-[1.02fr_.98fr] md:pb-36 md:pt-20">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 py-1.5 pl-1.5 pr-4 text-[13px] font-bold backdrop-blur">
            <span className="rounded-full bg-orange px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider">Neu</span>
            KI-Assistent · bereit für die Reform 2027
          </span>
          <h1 className="mt-6 text-[clamp(42px,6.2vw,78px)] font-extrabold leading-[1.0] tracking-[-0.03em] text-balance">
            Weniger Büro.
            <br />
            Mehr Fahrstunden.
          </h1>
          <p className="mt-6 max-w-[46ch] text-[18px] leading-relaxed text-white/85 md:text-[19px]">
            FahrschulApp verbindet Disposition, Schülerakte, Finanzen, Prüfungen und Schüler-App in einem System – mit KI-Assistent und
            automatischen Terminerinnerungen. Für Fahrschulen, die lieber fahren als verwalten.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Btn href="/demo" size="lg" arrow>
              Demo anfordern
            </Btn>
            <Btn href="/funktionen" variant="outline" size="lg">
              Funktionen ansehen
            </Btn>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-7 gap-y-2.5">
            <Check light>DSGVO-konform, Server in Deutschland</Check>
            <Check light>In Minuten startklar</Check>
            <Check light>Persönlicher Support</Check>
          </ul>
        </div>

        <div className="relative md:pl-6" data-reveal data-delay="80ms">
          <LaptopFrame className="max-w-[640px]">
            <div className="flex items-center gap-2 border-b border-line bg-white px-3 py-2">
              <span className="text-[13px] font-extrabold">
                Fahrschul<span className="text-brand">App</span>
              </span>
              <span className="rounded-full bg-brand-light px-2 py-0.5 text-[10px] font-bold text-brand-dark">Leitstand</span>
              <span className="ml-auto text-[11px] text-muted">Fahrschule Weber · heute</span>
            </div>
            <DashboardMock />
          </LaptopFrame>
          <div className="absolute -bottom-20 -left-6 hidden origin-bottom-left scale-[0.68] sm:block md:-left-10">
            <div className="animate-floaty">
              <PhoneMock />
            </div>
          </div>
          <div className="absolute -right-2 top-4 flex items-center gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 text-ink shadow-lift md:-right-4">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-light text-brand">
              <Bell className="h-4 w-4" />
            </span>
            <div className="leading-tight">
              <div className="text-[13px] font-extrabold">Termin bestätigt ✓</div>
              <div className="text-[11.5px] text-muted">Lisa · Do 09:00</div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

const TILES = [
  { icon: LayoutGrid, v: "6 Module", l: "Disposition bis Schüler-App – ein Login" },
  { icon: Users2, v: "3 Rollen", l: "Chef, Büro und Fahrlehrer sehen ihr Nötiges" },
  { icon: Cloud, v: "24/7", l: "Cloud, alle Geräte, immer aktuell" },
  { icon: FileCheck2, v: "0 Papier", l: "Digitale Akte mit E-Signatur" },
];

/** Vier Fakten-Kacheln, die in den Hero hineinragen. */
export function TrustTiles() {
  return (
    <div className="relative z-10 -mt-14 md:-mt-16">
      <Container>
        <div className="grid gap-3 rounded-3xl bg-white p-3 shadow-lift sm:grid-cols-2 lg:grid-cols-4" data-reveal>
          {TILES.map((t) => (
            <div key={t.v} className="flex items-center gap-4 rounded-2xl bg-paper px-5 py-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand text-white">
                <t.icon className="h-5 w-5" />
              </span>
              <div className="leading-tight">
                <div className="tnum text-[22px] font-extrabold tracking-tight text-ink">{t.v}</div>
                <div className="text-[13px] text-muted">{t.l}</div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}

const LOGOS = ["DATEV", "SEPA", "XRechnung", "TÜV", "DEKRA", "WhatsApp", "DSGVO", "GoBD"];

/** Leiste mit Standards & Schnittstellen – als Wortmarken, ohne erfundene Kundenlogos. */
export function LogoStrip() {
  return (
    <div className="border-b border-line bg-white py-10">
      <Container>
        <p className="text-center text-[13px] font-bold uppercase tracking-[0.14em] text-muted">Gemacht für den deutschen Fahrschulalltag</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {LOGOS.map((l) => (
            <span key={l} className={cn("text-[22px] font-extrabold tracking-tight text-ink/35 md:text-[26px]")}>
              {l}
            </span>
          ))}
        </div>
        <p className="mt-5 text-center text-[12.5px] text-muted">Den Stand einzelner Schnittstellen besprechen wir transparent im Gespräch.</p>
      </Container>
    </div>
  );
}

/** Foto-Banner mit großer Versalien-Headline. */
export function PhotoBanner() {
  return (
    <section className="relative overflow-hidden bg-dark text-white">
      <Image src="/images/lektion-steuer.jpg" alt="" aria-hidden fill sizes="100vw" className="object-cover" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-dark/90 via-dark/60 to-dark/20" aria-hidden />
      <Container className="relative py-28 md:py-40">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-[13px] font-bold backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-orange" /> Für Fahrschulen, die lieber fahren
        </span>
        <h2 className="mt-5 max-w-5xl font-display text-[clamp(44px,6.8vw,96px)] font-extrabold uppercase leading-[0.92] tracking-[0.005em]">
          Deine Schüler fahren.
          <br />
          Du hast den Kopf frei.
        </h2>
        <p className="mt-6 max-w-[48ch] text-[18px] leading-relaxed text-white/85">
          Termine, Erinnerungen, Rechnungen und Prüfungen laufen im Hintergrund. Du bist dort, wo deine Fahrschule Geld verdient: im Auto.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Btn href="/demo" size="lg" arrow>
            Jetzt Demo anfordern
          </Btn>
          <Btn href="/#highlights" variant="outline" size="lg">
            Das hat sonst keiner
          </Btn>
        </div>
      </Container>
    </section>
  );
}
