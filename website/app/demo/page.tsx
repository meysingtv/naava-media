import type { Metadata } from "next";
import { Check, PhoneCall } from "lucide-react";

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
    <section className="relative overflow-hidden py-16 md:py-24">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: "radial-gradient(50% 45% at 95% 0%, rgba(157,241,200,.4), transparent 68%)" }}
        aria-hidden
      />
      <Container className="grid gap-14 md:grid-cols-[1fr_1.05fr] md:gap-16">
        <div>
          <Eyebrow>Demo anfordern</Eyebrow>
          <h1 className="mt-5 font-display text-[clamp(34px,5vw,52px)] font-extrabold leading-[1.0] tracking-[-0.02em] text-ink text-balance">
            Schau dir an, wie deine Fahrschule laufen könnte.
          </h1>
          <p className="mt-5 max-w-[44ch] text-[18px] leading-relaxed text-muted">
            Wir zeigen dir FahrschulApp anhand deines Arbeitsalltags – von der ersten Fahrstunde bis zur Rechnung. Unverbindlich
            und ohne Verpflichtung.
          </p>

          <div className="mt-9">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.12em] text-mint">Was nach der Anfrage passiert</h2>
            <ol className="mt-4 grid gap-3">
              {SCHRITTE.map((s, i) => (
                <li key={s.t} className="flex items-start gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-mint-soft text-[13px] font-bold text-mint">{i + 1}</span>
                  <div>
                    <div className="text-[15.5px] font-semibold text-ink">{s.t}</div>
                    <div className="text-[14px] text-muted">{s.d}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-9 flex items-center gap-3 rounded-2xl border border-line bg-paper p-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-mint text-white">
              <PhoneCall className="h-5 w-5" />
            </span>
            <div className="text-[14.5px]">
              <div className="font-semibold text-ink">Lieber direkt sprechen?</div>
              <div className="text-muted">Ruf uns an: <span className="font-medium text-ink">+49 … (Platzhalter)</span></div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[14px] font-medium text-muted">
            {["Keine Verpflichtung", "Keine Kreditkarte", "DSGVO-konform"].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 text-mint" strokeWidth={3} /> {t}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-line bg-white p-6 shadow-[0_30px_70px_-40px_rgba(15,45,30,.3)] md:p-8">
          <DemoForm />
        </div>
      </Container>
    </section>
  );
}
