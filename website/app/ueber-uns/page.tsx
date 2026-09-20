import type { Metadata } from "next";
import Image from "next/image";
import { HeartHandshake, MapPin, Rocket, Wrench } from "lucide-react";

import { Container, cn } from "@/components/ui";
import { CtaBand, SectionHead } from "@/components/bits";
import { PageHero } from "@/components/page-hero";
import { Pilot } from "@/components/home/ablauf";

export const metadata: Metadata = {
  title: "Über uns",
  description: "FahrschulApp ist gründer-geführt und mit Fokus auf den echten Fahrschulalltag entwickelt. Made in Germany.",
  alternates: { canonical: "/ueber-uns" },
};

const WERTE = [
  { icon: Rocket, t: "Gründer-geführt", d: "Kurze Wege, schnelle Entscheidungen, direkter Draht zu dem, der die Software baut.", bg: "bg-brand" },
  { icon: Wrench, t: "Fokus Fahrschule", d: "Entwickelt entlang echter Abläufe – Disposition, Schüler, Finanzen, Prüfungen – nicht am Reißbrett.", bg: "bg-purple" },
  { icon: HeartHandshake, t: "Nähe zum Kunden", d: "Persönlicher Support und ein offenes Ohr. Was Fahrschulen brauchen, entscheidet die Roadmap.", bg: "bg-orange" },
  { icon: MapPin, t: "Made in Germany", d: "Entwicklung, Hosting und Datenhaltung mit deutschem Anspruch an Datenschutz.", bg: "bg-sky" },
];

export default function UeberUnsPage() {
  return (
    <>
      <PageHero
        eyebrow="Über uns"
        title="Software für Fahrschulen – von Menschen, die genau hinschauen."
        sub="FahrschulApp ist als gründer-geführtes Produkt entstanden – mit dem Anspruch, den organisatorischen Alltag einer Fahrschule spürbar leichter zu machen."
      >
        <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] shadow-lift">
          <Image src="/images/fahrt.jpg" alt="Sonnige Fahrt am Steuer" fill sizes="(max-width: 768px) 100vw, 45vw" className="object-cover" priority />
        </div>
      </PageHero>

      <section className="py-20 md:py-24">
        <Container>
          <SectionHead
            center
            eyebrow="Wofür wir stehen"
            title="Weniger Verwaltung. Mehr Fahrschule."
            sub="Wir bauen nah an den echten Abläufen: Disposition, Schüler, Finanzen, Prüfungen und Kommunikation greifen ineinander. Was Fahrschulen wirklich brauchen, entscheidet die Weiterentwicklung – nicht der Trend."
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {WERTE.map((w, i) => (
              <div key={w.t} data-reveal data-delay={`${i * 60}ms`} className="rounded-3xl bg-paper p-6">
                <span className={cn("grid h-12 w-12 place-items-center rounded-2xl text-white", w.bg)}>
                  <w.icon className="h-[22px] w-[22px]" />
                </span>
                <h2 className="mt-4 text-[19px] font-extrabold tracking-tight">{w.t}</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{w.d}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 rounded-2xl bg-orange-light px-5 py-4 text-[14px] text-orange-dark">
            <b>Kontakt (Platzhalter):</b> E-Mail hallo@beispiel.de · Telefon +49 … · Adresse [Platzhalter] — vor dem Livegang durch echte Angaben ersetzen.
          </p>
        </Container>
      </section>

      <Pilot />
      <CtaBand compact />
    </>
  );
}
