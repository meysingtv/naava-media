import type { Metadata } from "next";

import { Container, Eyebrow } from "@/components/ui";
import { CtaBand } from "@/components/bits";

export const metadata: Metadata = {
  title: "Funktionen",
  description:
    "Disposition, Schülerverwaltung, Finanzen, Theorie & Prüfungen, Schüler-App und Chef-Cockpit – alle Funktionen von FahrschulApp im Überblick.",
  alternates: { canonical: "/funktionen" },
};

const FEATURES = [
  {
    t: "Disposition",
    d: "Fahrlehrer, Fahrzeuge und Schüler auf einer Zeitachse. Verfügbarkeiten, Prüfungen und Sperrzeiten inklusive – Konflikte erkennt das System, bevor sie entstehen.",
    p: ["Ressourcen-Board für Lehrer und Fahrzeuge", "Farbcodierte Termine, freie Slots", "Konflikterkennung"],
  },
  {
    t: "Schülerverwaltung",
    d: "Digitale Ausbildungsakte mit Fortschritt, Dokumenten, Unterlagen-Checkliste und Ausbildungsnachweis – papierlos und immer aktuell.",
    p: ["Fortschritt und Prüfungsreife", "Ausbildungsnachweis mit E-Signatur", "Dokumente und Checklisten"],
  },
  {
    t: "Finanzen",
    d: "Rechnungen, Ratenpläne und Mahnwesen mit SEPA, XRechnung und DATEV. Der Zahlungsstatus ist jederzeit klar.",
    p: ["Ratenpläne und Mahnwesen", "Offene Posten nach Alter", "DATEV-Export"],
  },
  {
    t: "Theorie & Prüfungen",
    d: "Theoriefortschritt, Prüfungstermine und offene Voraussetzungen an einem Ort. So weißt du früh, wer bereit ist.",
    p: ["Prüfungstermine und Status", "Erinnerungen an offene Voraussetzungen", "Theorie und Praxis verbunden"],
  },
  {
    t: "Schüler-App & Portal",
    d: "Termine, Fortschritt, Zahlungen und Nachrichten in einer App im Design deiner Fahrschule. Termine bestätigen die Schüler per Link.",
    p: ["Termine bestätigen", "Online bezahlen", "Eigenes Branding"],
  },
  {
    t: "Auswertung & Cockpit",
    d: "Live-Auslastung, No-Show-Quote und offene Posten nach Alter – die wichtigsten Zahlen, bevor du danach suchen musst.",
    p: ["Auslastung je Fahrlehrer und Fahrzeug", "No-Show-Quote in Echtzeit", "Frühwarnungen"],
  },
];

const HIGHLIGHTS = [
  { n: "1", t: "KI-Assistent", d: "Sag in normaler Sprache, was passieren soll. Der Assistent schlägt Aktionen vor und führt sie nach Bestätigung aus." },
  { n: "2", t: "No-Show-Killer", d: "Automatische Erinnerungen per WhatsApp, SMS und E-Mail – mit Zusage- und Absage-Link." },
  { n: "3", t: "Smart-Disposition", d: "Die nächste sinnvolle Fahrstunde auf einen Klick – mit freiem Slot, Fahrlehrer und Fahrzeug." },
  { n: "4", t: "Chef-Cockpit", d: "Auslastung, Ausfälle und offene Posten nach Alter – live und ohne Suchen." },
];

export default function FunktionenPage() {
  return (
    <>
      <section className="bg-cream pb-6 pt-14 md:pt-20">
        <Container wide>
          <div className="flex items-center justify-between border-b border-line pb-4 font-mono text-[11.5px] uppercase tracking-[0.16em] text-muted">
            <span>Funktionen</span>
            <span className="tnum">Sechs Bereiche · Ein System</span>
          </div>
          <div className="grid gap-8 pt-12 md:grid-cols-12 md:pt-16">
            <div className="md:col-span-3">
              <Eyebrow>Übersicht</Eyebrow>
            </div>
            <div className="md:col-span-9 lg:col-span-8">
              <h1 className="font-display text-[clamp(38px,5.4vw,76px)] font-normal leading-[0.98] tracking-[-0.02em] text-ink text-balance">
                Alles, was den Fahrschulalltag leichter macht.
              </h1>
              <p className="mt-6 max-w-[52ch] text-[18px] leading-[1.6] text-ink/70">
                Von der Disposition bis zur Abrechnung – ein System, das zusammenarbeitet, statt gegeneinander.
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-cream pb-20 pt-10 md:pb-28">
        <Container wide>
          <ol className="border-t border-line">
            {FEATURES.map((f, i) => (
              <li key={f.t} data-reveal className="grid gap-4 border-b border-line py-10 md:grid-cols-12 md:gap-8 md:py-14">
                <span className="tnum font-mono text-[12px] uppercase tracking-[0.16em] text-pylon md:col-span-2">0{i + 1}</span>
                <h2 className="font-display text-[clamp(26px,3vw,40px)] leading-[1.05] tracking-[-0.015em] text-ink md:col-span-4">{f.t}</h2>
                <div className="md:col-span-6">
                  <p className="max-w-[56ch] text-[16.5px] leading-[1.6] text-ink/70">{f.d}</p>
                  <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
                    {f.p.map((p) => (
                      <li key={p} className="flex items-center gap-2 text-[14.5px] text-ink/80">
                        <span className="text-mint" aria-hidden>
                          —
                        </span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="grain grain-dark bg-ink py-20 text-cream md:py-28">
        <Container wide className="relative z-[2]">
          <div className="grid gap-8 md:grid-cols-12">
            <div className="md:col-span-3">
              <Eyebrow className="!text-mint-hi">Highlights</Eyebrow>
            </div>
            <h2 className="font-display text-[clamp(32px,4.2vw,58px)] font-normal leading-[1.02] tracking-[-0.02em] text-cream text-balance md:col-span-9 lg:col-span-8">
              Das, was sonst keiner hat.
            </h2>
          </div>
          <div className="mt-14 grid gap-10 border-t border-cream/15 pt-10 md:grid-cols-4 md:gap-8">
            {HIGHLIGHTS.map((h, i) => (
              <div key={h.t} data-reveal data-delay={`${i * 70}ms`} className="md:border-l md:border-cream/15 md:pl-6 md:first:border-l-0 md:first:pl-0">
                <span className="tnum font-display text-[52px] leading-none text-mint-hi">{h.n}</span>
                <h3 className="mt-5 font-display text-[24px] leading-tight">{h.t}</h3>
                <p className="mt-3 text-[15px] leading-[1.6] text-cream/65">{h.d}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <CtaBand />
    </>
  );
}
