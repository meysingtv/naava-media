import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";

import { Container, Eyebrow } from "@/components/marketing/ui";
import { DemoForm } from "@/components/marketing/demo-form";

export const metadata: Metadata = {
  title: "Kontakt",
  description: "Kontakt zu FahrschulApp – schreib uns oder fordere direkt eine Demo an.",
  alternates: { canonical: "/kontakt" },
};

const INFO = [
  { icon: Mail, t: "E-Mail", v: "hallo@beispiel.de", note: "Platzhalter" },
  { icon: Phone, t: "Telefon", v: "+49 …", note: "Platzhalter" },
  { icon: MapPin, t: "Adresse", v: "[Straße, PLZ Ort]", note: "Platzhalter" },
  { icon: Clock, t: "Erreichbar", v: "Mo–Fr 9–17 Uhr", note: "Platzhalter" },
];

export default function KontaktPage() {
  return (
    <section className="relative overflow-hidden bg-brand-light/60 py-14 md:py-20">
      <Container className="relative grid gap-12 md:grid-cols-[1fr_1.05fr] md:gap-16">
        <div>
          <Eyebrow>Kontakt</Eyebrow>
          <h1 className="mt-4 text-[clamp(34px,4.8vw,56px)] font-extrabold leading-[1.02] tracking-[-0.03em] text-ink text-balance">Sprich mit uns.</h1>
          <p className="mt-5 max-w-[44ch] text-[18px] leading-relaxed text-ink-muted">
            Fragen zur Software, zum Umstieg oder zum Datenschutz? Schreib uns – oder fordere direkt eine Demo an.
          </p>

          <div className="mt-9 grid gap-4 sm:grid-cols-2">
            {INFO.map((c) => (
              <div key={c.t} className="rounded-[16px] bg-white p-5 shadow-card">
                <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-brand-light text-brand">
                  <c.icon className="h-5 w-5" />
                </span>
                <div className="mt-3 text-[12px] font-extrabold uppercase tracking-[0.12em] text-ink-muted">{c.t}</div>
                <div className="text-[16px] font-extrabold text-ink">{c.v}</div>
                <div className="text-[12px] text-ink-muted">({c.note})</div>
              </div>
            ))}
          </div>

          <p className="mt-6 rounded-[16px] bg-white px-5 py-4 text-[14px] text-ink-muted shadow-card">
            Als Kunde erreichst du uns direkt und persönlich – ohne Ticket-Warteschleife.
          </p>
        </div>

        <div className="rounded-[28px] bg-white p-6 shadow-lift md:p-8">
          <h2 className="mb-5 text-[24px] font-extrabold tracking-tight">Demo anfordern</h2>
          <DemoForm />
        </div>
      </Container>
    </section>
  );
}
