import { AlertTriangle } from "lucide-react";

import { Container } from "@/components/ui";

export function LegalShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="py-16 md:py-20">
      <Container className="max-w-3xl">
        <h1 className="font-display text-[clamp(30px,4vw,44px)] font-extrabold tracking-tight text-ink">{title}</h1>
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-[#C27C0E]/30 bg-[#C27C0E]/8 px-4 py-3 text-[14px] text-[#8a5a08]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Platzhalter-Inhalt. Bitte durch einen rechtssicheren Text ersetzen (z. B. über einen Generator oder anwaltlich
            geprüft). Impressum und Datenschutzerklärung sind in Deutschland gesetzlich verpflichtend.
          </p>
        </div>
        <div className="mt-8 grid gap-5 text-[16px] leading-relaxed text-muted [&_h2]:mt-6 [&_h2]:font-display [&_h2]:text-[20px] [&_h2]:font-bold [&_h2]:text-ink [&_strong]:text-ink">
          {children}
        </div>
      </Container>
    </section>
  );
}
