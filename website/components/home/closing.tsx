import { Container, Eyebrow, TextLink, cn } from "@/components/ui";
import { ChapterHead } from "@/components/home/chapters";

const INTEGRATIONEN = [
  { n: "DATEV", z: "Buchhaltungsexport", s: "Export", ok: true },
  { n: "SEPA", z: "Lastschrift", s: "Integriert", ok: true },
  { n: "XRechnung", z: "E-Rechnung an Kostenträger", s: "Integriert", ok: true },
  { n: "TÜV / DEKRA", z: "Prüfungstermine", s: "In Planung", ok: false },
  { n: "WhatsApp", z: "Erinnerungen", s: "In Umsetzung", ok: false },
];

const SICHERHEIT = [
  { t: "Server in der EU", d: "Verschlüsselte Speicherung, regelmäßige Backups." },
  { t: "Rollen und Rechte", d: "Chef, Büro und Fahrlehrer sehen genau das, was sie brauchen." },
  { t: "DSGVO-orientiert", d: "Auftragsverarbeitung, sichere Datenübertragung." },
  { t: "Zugriffskontrolle", d: "Klare Trennung je Fahrschule und Standort." },
];

export function Vertrauen() {
  return (
    <section id="sicherheit" className="bg-cream py-20 md:py-28">
      <Container wide>
        <ChapterHead
          num="06"
          label="Vertrauen"
          title="Passt in den deutschen Fahrschulalltag. Und nimmt Datenschutz ernst."
        />
        <div className="mt-14 grid gap-14 md:mt-20 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-6" data-reveal>
            <Eyebrow>Schnittstellen</Eyebrow>
            <table className="mt-5 w-full border-t border-line text-left">
              <tbody>
                {INTEGRATIONEN.map((i) => (
                  <tr key={i.n} className="border-b border-line align-baseline">
                    <th scope="row" className="py-3.5 pr-4 font-display text-[21px] font-normal text-ink">
                      {i.n}
                    </th>
                    <td className="py-3.5 pr-4 text-[15px] text-ink/65">{i.z}</td>
                    <td className="py-3.5 text-right font-mono text-[11.5px] uppercase tracking-[0.12em]">
                      <span className={cn("inline-flex items-center gap-2", i.ok ? "text-mint" : "text-muted")}>
                        <span className={cn("h-[6px] w-[6px]", i.ok ? "bg-mint" : "bg-line2")} aria-hidden />
                        {i.s}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 font-mono text-[11.5px] leading-relaxed text-muted">
              Den Stand einzelner Schnittstellen besprechen wir transparent im Gespräch – ohne Versprechen, die noch nicht eingelöst sind.
            </p>
          </div>

          <div className="md:col-span-5 md:col-start-8" data-reveal data-delay="90ms">
            <Eyebrow>Sicherheit</Eyebrow>
            <p className="mt-5 font-display text-[22px] leading-[1.35] text-ink md:text-[24px]">
              FahrschulApp ist von Grund auf DSGVO-orientiert gebaut. Jede Fahrschule sieht ausschließlich ihre eigenen Daten.
            </p>
            <dl className="mt-8 border-t border-line">
              {SICHERHEIT.map((s) => (
                <div key={s.t} className="grid gap-1 border-b border-line py-4 sm:grid-cols-[1fr_1.4fr] sm:gap-6">
                  <dt className="text-[16px] font-medium text-ink">{s.t}</dt>
                  <dd className="text-[15px] leading-[1.55] text-ink/65">{s.d}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-7">
              <TextLink href="/demo">Fragen zum Datenschutz? Sprich mit uns</TextLink>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

export function Stimmen() {
  return (
    <section className="grain bg-sand py-20 md:py-24">
      <Container wide className="relative z-[2] grid gap-10 md:grid-cols-12 md:gap-8">
        <div className="md:col-span-4">
          <Eyebrow>Stimmen</Eyebrow>
          <h2 className="mt-5 font-display text-[clamp(28px,3.2vw,40px)] leading-[1.06] tracking-[-0.015em] text-ink">Wir sind neu. Und ehrlich damit.</h2>
        </div>
        <div className="md:col-span-8" data-reveal>
          <p className="max-w-[60ch] text-[17px] leading-[1.65] text-ink/75 md:text-[18px]">
            Die ersten Fahrschulen arbeiten gerade mit FahrschulApp. Ihre Erfahrungen erscheinen hier, sobald sie da sind – als echte
            Zitate, nicht als erfundene Sternchen. Bis dahin zeigen wir dir die Software lieber persönlich.
          </p>
          <blockquote className="mt-10 border-l-2 border-pylon pl-6 font-display text-[clamp(22px,2.6vw,32px)] italic leading-[1.3] text-ink/45">
            „Hier steht bald, was eine Fahrschulinhaberin nach den ersten Wochen sagt."
          </blockquote>
          <p className="mt-3 pl-6 font-mono text-[11.5px] uppercase tracking-[0.14em] text-muted">Platzhalter · Fahrschule · Ort</p>
        </div>
      </Container>
    </section>
  );
}

const FAQ = [
  {
    q: "Was ist FahrschulApp?",
    a: "Eine All-in-one-Software für Fahrschulen: Disposition, Schülerverwaltung, Finanzen, Theorie und Prüfungen, Schüler-App und Auswertung – an einem Ort.",
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
    a: "Er verschickt automatische Terminerinnerungen per WhatsApp, SMS oder E-Mail. Schüler sagen per Link zu oder ab – das senkt Ausfälle.",
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
    a: "DSGVO-orientierte Architektur, Speicherung in der EU, Rollen und Rechte sowie sichere Datenübertragung. Jede Fahrschule sieht nur ihre eigenen Daten.",
  },
  { q: "Kann ich bestehende Daten übernehmen?", a: "Ja. Beim Umstieg helfen wir dir persönlich, deine Schüler- und Termindaten zu übernehmen." },
  { q: "Wie bekomme ich eine Demo?", a: "Über das Formular auf der Demo-Seite. Wir melden uns persönlich und stimmen einen Termin mit dir ab." },
];

export function Faq() {
  return (
    <section id="faq" className="bg-cream py-20 md:py-28">
      <Container wide>
        <div className="grid gap-10 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-4">
            <ChapterHead num="08" label="Fragen" title="Was Fahrschulen uns zuerst fragen." className="md:!block" />
          </div>
          <div className="border-t border-line md:col-span-8" data-reveal>
            {FAQ.map((f, i) => (
              <details key={f.q} className="group border-b border-line">
                <summary className="flex cursor-pointer items-baseline gap-5 py-5 text-[18px] font-medium text-ink marker:content-[''] [&::-webkit-details-marker]:hidden">
                  <span className="tnum font-mono text-[12px] text-pylon">{String(i + 1).padStart(2, "0")}</span>
                  <span className="flex-1">{f.q}</span>
                  <span className="font-display text-[26px] leading-none text-muted transition-transform duration-200 group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="pb-6 pl-11 text-[16px] leading-[1.65] text-ink/70">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
