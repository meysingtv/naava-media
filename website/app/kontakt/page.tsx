import type { Metadata } from "next";

import { Container, Eyebrow } from "@/components/ui";
import { DemoForm } from "@/components/demo-form";

export const metadata: Metadata = {
  title: "Kontakt",
  description: "Kontakt zu FahrschulApp – schreib uns oder fordere direkt eine Demo an.",
  alternates: { canonical: "/kontakt" },
};

const INFO = [
  { t: "E-Mail", v: "hallo@beispiel.de", note: "Platzhalter" },
  { t: "Telefon", v: "+49 …", note: "Platzhalter" },
  { t: "Adresse", v: "[Straße, PLZ Ort]", note: "Platzhalter" },
  { t: "Erreichbar", v: "Mo–Fr 9–17 Uhr", note: "Platzhalter" },
];

export default function KontaktPage() {
  return (
    <section className="bg-cream pb-20 pt-14 md:pb-28 md:pt-20">
      <Container wide>
        <div className="flex items-center justify-between border-b border-line pb-4 font-mono text-[11.5px] uppercase tracking-[0.16em] text-muted">
          <span>Kontakt</span>
          <span>Direkt · Persönlich</span>
        </div>
        <div className="grid gap-14 pt-12 md:grid-cols-12 md:gap-8 md:pt-16">
          <div className="md:col-span-5">
            <Eyebrow>Kontakt</Eyebrow>
            <h1 className="mt-5 font-display text-[clamp(36px,4.8vw,64px)] font-normal leading-[0.98] tracking-[-0.02em] text-ink text-balance">
              Sprich mit uns.
            </h1>
            <p className="mt-6 max-w-[42ch] text-[18px] leading-[1.6] text-ink/70">
              Fragen zur Software, zum Umstieg oder zum Datenschutz? Schreib uns – oder fordere direkt eine Demo an.
            </p>

            <dl className="mt-10 border-t border-line">
              {INFO.map((c) => (
                <div key={c.t} className="grid gap-1 border-b border-line py-4 sm:grid-cols-[120px_1fr] sm:gap-6">
                  <dt className="font-mono text-[11.5px] uppercase tracking-[0.14em] text-muted">{c.t}</dt>
                  <dd className="font-display text-[21px] leading-tight text-ink">
                    {c.v} <span className="font-sans text-[12px] text-muted">({c.note})</span>
                  </dd>
                </div>
              ))}
            </dl>

            <p className="mt-6 max-w-[48ch] font-mono text-[11.5px] leading-relaxed text-muted">
              Als Kunde erreichst du uns direkt und persönlich – ohne Ticket-Warteschleife.
            </p>
          </div>

          <div className="md:col-span-7 lg:col-span-6 lg:col-start-7">
            <div className="rounded-md border border-line bg-white p-6 md:p-8">
              <h2 className="mb-6 font-display text-[26px] leading-tight text-ink">Demo anfordern</h2>
              <DemoForm />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
