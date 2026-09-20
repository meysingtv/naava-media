import { Plus } from "lucide-react";

import { Container } from "@/components/ui";
import { SectionHead } from "@/components/bits";

export const FAQ = [
  {
    q: "Was ist FahrschulApp?",
    a: "Eine All-in-one-Software für Fahrschulen: Disposition, Schülerverwaltung, Finanzen, Theorie und Prüfungen, Schüler-App und Auswertung – an einem Ort, mit einem Login.",
  },
  {
    q: "Für welche Fahrschulen ist die Software geeignet?",
    a: "Von der Einzelfahrschule bis zu Betrieben mit mehreren Standorten. Rollen für Chef, Büro und Fahrlehrer sind eingebaut.",
  },
  { q: "Kann ich mehrere Standorte verwalten?", a: "Ja. Mehrere Fahrschulen laufen unter einem Dach, mit Auswertungen je Standort und zentralem Überblick." },
  {
    q: "Wie funktioniert der KI-Assistent?",
    a: "Du sagst in normaler Sprache, was passieren soll. Der Assistent versteht den Kontext, schlägt passende Aktionen vor und führt sie erst nach deiner Bestätigung aus.",
  },
  {
    q: "Was macht der No-Show-Killer?",
    a: "Er verschickt automatische Terminerinnerungen per WhatsApp, SMS oder E-Mail. Schüler sagen per Link zu oder ab – das senkt Ausfälle spürbar.",
  },
  {
    q: "Können Schüler ihre Termine selbst sehen?",
    a: "Ja, über die Schüler-App: Termine, Fortschritt, Nachrichten, Zahlungen und Rechnungen – im Design deiner Fahrschule.",
  },
  {
    q: "Gibt es DATEV, SEPA und XRechnung?",
    a: "Die Finanzfunktionen sind auf den deutschen Fahrschulalltag ausgelegt. Den genauen Stand einzelner Schnittstellen klären wir transparent im Gespräch.",
  },
  {
    q: "Wie werden meine Daten geschützt?",
    a: "DSGVO-konforme Architektur, Server in Deutschland, Rollen und Rechte sowie verschlüsselte Übertragung. Jede Fahrschule sieht nur ihre eigenen Daten.",
  },
  { q: "Kann ich bestehende Daten übernehmen?", a: "Ja. Beim Umstieg helfen wir dir persönlich, deine Schüler- und Termindaten zu übernehmen." },
  { q: "Wie bekomme ich eine Demo?", a: "Über das Formular auf der Demo-Seite. Wir melden uns persönlich und stimmen einen Termin mit dir ab – online oder bei dir vor Ort." },
];

export function Faq() {
  return (
    <section id="faq" className="bg-paper py-20 md:py-24">
      <Container>
        <SectionHead center eyebrow="FAQ" title="Was Fahrschulen uns zuerst fragen." />
        <div className="mx-auto mt-10 grid max-w-4xl gap-3" data-reveal>
          {FAQ.map((f) => (
            <details key={f.q} className="group overflow-hidden rounded-2xl bg-white shadow-card open:shadow-lift">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-[17px] font-bold text-ink marker:content-[''] [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-light text-brand transition-transform duration-200 group-open:rotate-45">
                  <Plus className="h-4 w-4" strokeWidth={3} />
                </span>
              </summary>
              <p className="px-6 pb-6 text-[15.5px] leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
