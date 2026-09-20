import type { Metadata } from "next";

import { Container, Eyebrow } from "@/components/ui";
import { DemoForm } from "@/components/demo-form";

export const metadata: Metadata = {
  title: "Demo anfordern",
  description: "Fordere eine persönliche Demo von FahrschulApp an. Wir zeigen dir die Software anhand deines Fahrschulalltags.",
  alternates: { canonical: "/demo" },
};

const SCHRITTE = [
  { t: "Anfrage senden", d: "Formular ausfüllen – dauert eine Minute." },
  { t: "Persönlich Kontakt", d: "Wir melden uns zeitnah bei dir." },
  { t: "Demo-Termin abstimmen", d: "Online oder bei dir – wie es dir passt." },
  { t: "Live kennenlernen", d: "Wir zeigen FahrschulApp an deinem Alltag." },
];

export default function DemoPage() {
  return (
    <section className="bg-cream pb-20 pt-14 md:pb-28 md:pt-20">
      <Container wide>
        <div className="flex items-center justify-between border-b border-line pb-4 font-mono text-[11.5px] uppercase tracking-[0.16em] text-muted">
          <span>Demo anfordern</span>
          <span>Persönlich · Unverbindlich</span>
        </div>
        <div className="grid gap-14 pt-12 md:grid-cols-12 md:gap-8 md:pt-16">
          <div className="md:col-span-5">
            <Eyebrow>Demo</Eyebrow>
            <h1 className="mt-5 font-display text-[clamp(36px,4.8vw,64px)] font-normal leading-[0.98] tracking-[-0.02em] text-ink text-balance">
              Schau dir an, wie deine Fahrschule laufen könnte.
            </h1>
            <p className="mt-6 max-w-[44ch] text-[18px] leading-[1.6] text-ink/70">
              Wir zeigen dir FahrschulApp anhand deines Arbeitsalltags – von der ersten Fahrstunde bis zur Rechnung. Ohne Verkaufsshow,
              ohne Verpflichtung.
            </p>

            <ol className="mt-10 border-t border-line">
              {SCHRITTE.map((s, i) => (
                <li key={s.t} className="grid grid-cols-[auto_1fr] items-baseline gap-5 border-b border-line py-4">
                  <span className="tnum font-mono text-[12px] text-pylon">0{i + 1}</span>
                  <div>
                    <div className="font-display text-[21px] leading-tight text-ink">{s.t}</div>
                    <div className="mt-1 text-[15px] text-ink/65">{s.d}</div>
                  </div>
                </li>
              ))}
            </ol>

            <dl className="mt-8 grid gap-3 font-mono text-[11.5px] uppercase tracking-[0.14em] text-muted sm:grid-cols-2">
              <div>
                <dt className="text-ink">Lieber direkt sprechen?</dt>
                <dd className="mt-1">+49 … (Platzhalter)</dd>
              </div>
              <div>
                <dt className="text-ink">Gut zu wissen</dt>
                <dd className="mt-1">Keine Kreditkarte · DSGVO-konform</dd>
              </div>
            </dl>
          </div>

          <div className="md:col-span-7 lg:col-span-6 lg:col-start-7">
            <div className="rounded-md border border-line bg-white p-6 md:p-8">
              <DemoForm />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
