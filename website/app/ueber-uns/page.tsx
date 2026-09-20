import type { Metadata } from "next";

import { Container, Eyebrow } from "@/components/ui";
import { CtaBand } from "@/components/bits";

export const metadata: Metadata = {
  title: "Über uns",
  description: "FahrschulApp ist gründer-geführt und mit Fokus auf den echten Fahrschulalltag entwickelt. Made in Germany.",
  alternates: { canonical: "/ueber-uns" },
};

const WERTE = [
  { t: "Gründer-geführt", d: "Kurze Wege, schnelle Entscheidungen, direkter Draht zu dem, der die Software baut." },
  { t: "Fokus Fahrschule", d: "Entwickelt entlang echter Abläufe – Disposition, Schüler, Finanzen, Prüfungen – nicht am Reißbrett." },
  { t: "Nähe zum Kunden", d: "Persönlicher Support und ein offenes Ohr für Wünsche. Was Fahrschulen brauchen, entscheidet die Roadmap." },
  { t: "Made in Germany", d: "Entwicklung, Hosting und Datenhaltung mit deutschem Anspruch an Datenschutz." },
];

export default function UeberUnsPage() {
  return (
    <>
      <section className="bg-cream pb-16 pt-14 md:pb-24 md:pt-20">
        <Container wide>
          <div className="flex items-center justify-between border-b border-line pb-4 font-mono text-[11.5px] uppercase tracking-[0.16em] text-muted">
            <span>Über uns</span>
            <span>Deutschland</span>
          </div>
          <div className="grid gap-8 pt-12 md:grid-cols-12 md:pt-16">
            <div className="md:col-span-3">
              <Eyebrow>Wer dahinter steht</Eyebrow>
            </div>
            <div className="md:col-span-9 lg:col-span-8">
              <h1 className="font-display text-[clamp(36px,5vw,70px)] font-normal leading-[0.98] tracking-[-0.02em] text-ink text-balance">
                Software für Fahrschulen – von Menschen, die genau hinschauen.
              </h1>
              <div className="mt-8 grid max-w-[62ch] gap-5 text-[17.5px] leading-[1.65] text-ink/75">
                <p>
                  FahrschulApp ist als gründer-geführtes Produkt entstanden – mit dem Anspruch, den organisatorischen Alltag einer
                  Fahrschule spürbar leichter zu machen. Statt aufgeblähter Verwaltung: eine Software, die zusammenarbeitet.
                </p>
                <p>
                  Wir bauen nah an den echten Abläufen: Disposition, Schüler, Finanzen, Prüfungen und Kommunikation greifen
                  ineinander. Was Fahrschulen wirklich brauchen, entscheidet die Weiterentwicklung – nicht der Trend.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-cream pb-20 md:pb-28">
        <Container wide>
          <dl className="grid border-t border-line md:grid-cols-2 md:gap-x-12">
            {WERTE.map((w, i) => (
              <div key={w.t} data-reveal data-delay={`${i * 60}ms`} className="grid gap-2 border-b border-line py-7 sm:grid-cols-[1fr_1.5fr] sm:gap-6">
                <dt className="flex items-baseline gap-4">
                  <span className="tnum font-mono text-[12px] text-pylon">0{i + 1}</span>
                  <span className="font-display text-[24px] leading-tight text-ink">{w.t}</span>
                </dt>
                <dd className="text-[15.5px] leading-[1.6] text-ink/70">{w.d}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-10 max-w-[70ch] font-mono text-[11.5px] leading-relaxed text-muted">
            Kontakt (Platzhalter): E-Mail hallo@beispiel.de · Telefon +49 … · Adresse [Platzhalter] — vor dem Livegang durch echte
            Angaben ersetzen.
          </p>
        </Container>
      </section>

      <CtaBand />
    </>
  );
}
