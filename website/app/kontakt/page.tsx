import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";

import { Container, Eyebrow } from "@/components/ui";
import { DemoForm } from "@/components/demo-form";

export const metadata: Metadata = {
  title: "Kontakt",
  description: "Kontakt zu FahrschulApp – schreib uns oder fordere direkt eine Demo an.",
  alternates: { canonical: "/kontakt" },
};

const INFO = [
  { icon: Mail, t: "E-Mail", v: "hallo@beispiel.de", note: "Platzhalter" },
  { icon: Phone, t: "Telefon", v: "+49 … ", note: "Platzhalter" },
  { icon: MapPin, t: "Adresse", v: "[Straße, PLZ Ort]", note: "Platzhalter" },
  { icon: Clock, t: "Geschäftszeiten", v: "Mo–Fr 9–17 Uhr", note: "Platzhalter" },
];

export default function KontaktPage() {
  return (
    <section className="py-16 md:py-24">
      <Container className="grid gap-14 md:grid-cols-[1fr_1.05fr] md:gap-16">
        <div>
          <Eyebrow>Kontakt</Eyebrow>
          <h1 className="mt-5 font-display text-[clamp(32px,4.6vw,50px)] font-extrabold leading-[1.02] tracking-[-0.02em] text-ink text-balance">
            Sprich mit uns.
          </h1>
          <p className="mt-5 max-w-[42ch] text-[18px] leading-relaxed text-muted">
            Fragen zur Software, zum Umstieg oder zum Datenschutz? Schreib uns – oder fordere direkt eine Demo an.
          </p>

          <div className="mt-9 grid gap-4 sm:grid-cols-2">
            {INFO.map((c) => (
              <div key={c.t} className="rounded-2xl border border-line bg-white p-5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-mint-soft text-mint">
                  <c.icon className="h-5 w-5" />
                </span>
                <div className="mt-3 text-[13px] font-bold uppercase tracking-wide text-muted">{c.t}</div>
                <div className="text-[16px] font-semibold text-ink">{c.v}</div>
                <div className="text-[12px] text-muted">({c.note})</div>
              </div>
            ))}
          </div>

          <p className="mt-6 rounded-xl bg-paper px-4 py-3 text-[13.5px] text-muted">
            Support-Hinweis: Als Kunde erreichst du uns direkt und persönlich – ohne Ticket-Warteschleife.
          </p>
        </div>

        <div className="rounded-3xl border border-line bg-white p-6 shadow-[0_30px_70px_-40px_rgba(15,45,30,.3)] md:p-8">
          <h2 className="mb-5 font-display text-[22px] font-bold">Demo anfordern</h2>
          <DemoForm />
        </div>
      </Container>
    </section>
  );
}
