import type { Metadata } from "next";
import { PhoneCall } from "lucide-react";

import { Check, Container, Eyebrow } from "@/components/marketing/ui";
import { DemoForm } from "@/components/marketing/demo-form";

export const metadata: Metadata = {
  title: "Demo anfordern",
  description: "Fordere eine persönliche Demo von FahrschulApp an. Wir zeigen dir die Software anhand deines Fahrschulalltags.",
  alternates: { canonical: "/demo" },
};

const SCHRITTE = [
  { t: "Anfrage senden", d: "Formular ausfüllen – dauert eine Minute." },
  { t: "Persönlich Kontakt", d: "Wir melden uns innerhalb von 24 Stunden bei dir." },
  { t: "Demo-Termin abstimmen", d: "Online oder bei dir – wie es dir passt." },
  { t: "Live kennenlernen", d: "Wir zeigen FahrschulApp an deinem Alltag." },
];

export default function DemoPage() {
  return (
    <section className="relative overflow-hidden bg-brand-light/60 py-14 md:py-20">
      <div className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-brand/15 blur-3xl" aria-hidden />
      <Container className="relative grid gap-12 md:grid-cols-[1fr_1.05fr] md:gap-16">
        <div>
          <Eyebrow>Demo anfordern</Eyebrow>
          <h1 className="mt-4 text-[clamp(34px,4.8vw,56px)] font-extrabold leading-[1.02] tracking-[-0.03em] text-ink text-balance">
            Schau dir an, wie deine Fahrschule laufen könnte.
          </h1>
          <p className="mt-5 max-w-[46ch] text-[18px] leading-relaxed text-ink-muted">
            Wir zeigen dir FahrschulApp anhand deines Arbeitsalltags – von der ersten Fahrstunde bis zur Rechnung. Kostenlos, unverbindlich und ohne
            Verkaufsshow.
          </p>

          <ol className="mt-9 grid gap-4">
            {SCHRITTE.map((s, i) => (
              <li key={s.t} className="flex items-start gap-4">
                <span className="tnum grid h-9 w-9 shrink-0 place-items-center rounded-full bg-orange text-[14px] font-extrabold text-white shadow-cta">{i + 1}</span>
                <div>
                  <div className="text-[16.5px] font-extrabold text-ink">{s.t}</div>
                  <div className="text-[14.5px] text-ink-muted">{s.d}</div>
                </div>
              </li>
            ))}
          </ol>

          <ul className="mt-9 grid gap-2.5">
            <Check>Keine Verpflichtung, keine Kreditkarte</Check>
            <Check>Einrichtung und Datenübernahme inklusive</Check>
            <Check>DSGVO-konform, Server in Deutschland</Check>
          </ul>

          <div className="mt-9 flex items-center gap-3 rounded-[16px] bg-white p-4 shadow-card">
            <span className="grid h-11 w-11 place-items-center rounded-[12px] bg-brand text-white">
              <PhoneCall className="h-5 w-5" />
            </span>
            <div className="text-[14.5px]">
              <div className="font-extrabold text-ink">Lieber direkt sprechen?</div>
              <div className="text-ink-muted">
                Ruf uns an: <span className="font-bold text-ink">+49 … (Platzhalter)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] bg-white p-6 shadow-lift md:p-8">
          <DemoForm />
        </div>
      </Container>
    </section>
  );
}
