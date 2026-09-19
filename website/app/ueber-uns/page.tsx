import type { Metadata } from "next";
import { HeartHandshake, MapPin, Rocket, Wrench } from "lucide-react";

import { Container, Eyebrow } from "@/components/ui";
import { CtaBand } from "@/components/bits";

export const metadata: Metadata = {
  title: "Über uns",
  description: "FahrschulApp ist gründer-geführt und mit Fokus auf den echten Fahrschulalltag entwickelt. Made in Germany.",
  alternates: { canonical: "/ueber-uns" },
};

const WERTE = [
  { icon: Rocket, t: "Gründer-geführt", d: "Kurze Wege, schnelle Entscheidungen, direkter Draht zum Macher." },
  { icon: Wrench, t: "Fokus Fahrschule", d: "Entwickelt entlang echter Abläufe – nicht am Reißbrett." },
  { icon: HeartHandshake, t: "Nähe zum Kunden", d: "Persönlicher Support und ein offenes Ohr für Wünsche." },
  { icon: MapPin, t: "Made in Germany", d: "Entwicklung und Datenhaltung mit deutschem Anspruch." },
];

export default function UeberUnsPage() {
  return (
    <>
      <section className="py-16 md:py-20">
        <Container>
          <Eyebrow>Über uns</Eyebrow>
          <h1 className="mt-5 max-w-3xl font-display text-[clamp(32px,4.6vw,50px)] font-extrabold leading-[1.02] tracking-[-0.02em] text-ink text-balance">
            Software für Fahrschulen – von Menschen, die genau hinschauen.
          </h1>
          <div className="mt-6 grid max-w-[62ch] gap-4 text-[17.5px] leading-relaxed text-muted">
            <p>
              FahrschulApp ist als gründer-geführtes Produkt entstanden – mit dem Anspruch, den organisatorischen Alltag
              einer Fahrschule spürbar leichter zu machen. Statt aufgeblähter Verwaltung: eine Software, die zusammenarbeitet.
            </p>
            <p>
              Wir bauen nah an den echten Abläufen: Disposition, Schüler, Finanzen, Prüfungen und Kommunikation greifen
              ineinander. Was Fahrschulen wirklich brauchen, entscheidet die Weiterentwicklung – nicht der Trend.
            </p>
          </div>
        </Container>
      </section>

      <section className="pb-20">
        <Container>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {WERTE.map((w) => (
              <div key={w.t} data-reveal className="rounded-2xl border border-line bg-white p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-mint-soft text-mint">
                  <w.icon className="h-5 w-5" />
                </span>
                <h2 className="mt-3.5 text-[17px] font-bold">{w.t}</h2>
                <p className="mt-1.5 text-[14.5px] text-muted">{w.d}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-line bg-paper p-6 text-[14.5px] text-muted">
            <span className="font-semibold text-ink">Kontakt (Platzhalter):</span>{" "}
            E-Mail: hallo@beispiel.de · Telefon: +49 … · Adresse: [Platzhalter] — bitte durch echte Angaben ersetzen.
          </div>
        </Container>
      </section>

      <CtaBand />
    </>
  );
}
