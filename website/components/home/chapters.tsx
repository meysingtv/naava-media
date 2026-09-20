import Image from "next/image";

import { Container, Eyebrow, cn } from "@/components/ui";
import { BrowserFrame, ChatMock, CockpitMock, DispoMock, FinanzenMock, PhoneMock, SchuelerakteMock } from "@/components/mockups";

/** Kapitelkopf: Nummer + Rubrik links, große Serifen-Überschrift rechts. */
export function ChapterHead({
  num,
  label,
  title,
  intro,
  light,
  className,
}: {
  num: string;
  label: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
  light?: boolean;
  className?: string;
}) {
  return (
    <header className={cn("grid gap-6 md:grid-cols-12 md:gap-8", className)}>
      <div className="md:col-span-3">
        <Eyebrow num={num} className={light ? "!text-mint-hi" : ""}>
          {label}
        </Eyebrow>
      </div>
      <div className="md:col-span-9 lg:col-span-8">
        <h2
          className={cn(
            "font-display text-[clamp(34px,4.6vw,64px)] font-normal leading-[1.02] tracking-[-0.02em] text-balance",
            light ? "text-cream" : "text-ink",
          )}
        >
          {title}
        </h2>
        {intro && <p className={cn("mt-6 max-w-[58ch] text-[17px] leading-[1.6] md:text-[18px]", light ? "text-cream/70" : "text-ink/70")}>{intro}</p>}
      </div>
    </header>
  );
}

const PAINS = [
  "Termine in drei verschiedenen Kalendern",
  "Fahrlehrer per Telefon koordinieren",
  "Schüler fragen nach ihrem nächsten Termin",
  "Absagen gehen unter, Sitze bleiben leer",
  "Offene Rechnungen im Kopf behalten",
  "Papierakten, Excel-Listen, Gruppenchats",
];

export function Alltag() {
  return (
    <section id="alltag" className="bg-cream py-20 md:py-28">
      <Container wide>
        <ChapterHead num="01" label="Der Alltag" title="Der Tag hat 24 Stunden. Zu viele davon gehen ins Büro." />
        <div className="mt-14 grid gap-10 md:mt-20 md:grid-cols-12 md:gap-8">
          <figure className="md:col-span-7" data-reveal>
            <div className="relative aspect-[3/2] overflow-hidden rounded-sm">
              <Image
                src="/images/papierkram.jpg"
                alt="Zwei Personen gehen im Auto Unterlagen durch"
                fill
                sizes="(max-width: 768px) 100vw, 58vw"
                className="object-cover"
              />
            </div>
            <figcaption className="mt-3 flex items-start justify-between gap-6 font-mono text-[11.5px] leading-relaxed text-muted">
              <span>Terminzettel, Excel, Gruppenchat: Der Alltag vieler Fahrschulen läuft über fünf Kanäle.</span>
              <span className="tnum shrink-0">Abb. 02</span>
            </figcaption>
          </figure>
          <div className="md:col-span-5 md:pl-6 lg:pl-10" data-reveal data-delay="90ms">
            <p className="font-display text-[22px] leading-[1.35] text-ink md:text-[26px]">
              Eine Fahrschule ist kein Büro. Trotzdem sammelt sich dort jeden Tag Verwaltung an, die niemand bestellt hat.
            </p>
            <ul className="mt-8 border-t border-line">
              {PAINS.map((p) => (
                <li key={p} className="flex items-center gap-4 border-b border-line py-3.5 text-[16px] text-ink/80">
                  <span className="font-mono text-[13px] text-pylon" aria-hidden>
                    ×
                  </span>
                  {p}
                </li>
              ))}
            </ul>
            <p className="mt-8 font-display text-[clamp(22px,2.4vw,30px)] italic leading-[1.25] text-mint">
              Ein System. Ein Überblick. Weniger Nacharbeit.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}

type Tone = "mint" | "sand" | "paper";

function Spread({
  id,
  index,
  title,
  text,
  points,
  tone = "sand",
  reverse,
  children,
  caption,
}: {
  id?: string;
  index: string;
  title: React.ReactNode;
  text: React.ReactNode;
  points: string[];
  tone?: Tone;
  reverse?: boolean;
  children: React.ReactNode;
  caption?: string;
}) {
  const field = {
    mint: "grain grain-dark bg-mint-deep",
    sand: "grain bg-sand",
    paper: "grain border border-line bg-paper",
  }[tone];
  return (
    <article id={id} className="grid gap-8 border-t border-line py-12 md:grid-cols-12 md:items-center md:gap-10 md:py-16">
      <div className={cn("md:col-span-4 md:row-start-1", reverse ? "md:col-start-9" : "md:col-start-1")} data-reveal>
        <span className="tnum font-mono text-[12px] uppercase tracking-[0.16em] text-pylon">{index}</span>
        <h3 className="mt-3 font-display text-[clamp(26px,2.8vw,38px)] leading-[1.08] tracking-[-0.015em] text-ink text-balance">{title}</h3>
        <p className="mt-5 text-[16.5px] leading-[1.6] text-ink/70">{text}</p>
        <ul className="mt-6 border-t border-line">
          {points.map((p) => (
            <li key={p} className="flex gap-3 border-b border-line py-2.5 text-[15px] text-ink/85">
              <span className="text-mint" aria-hidden>
                —
              </span>
              {p}
            </li>
          ))}
        </ul>
      </div>
      <div className={cn("md:col-span-8 md:row-start-1", reverse ? "md:col-start-1" : "md:col-start-5")} data-reveal data-delay="80ms">
        <div className={cn("relative rounded-sm p-4 sm:p-8 lg:p-12", field)}>
          <div className="relative z-[2]">{children}</div>
        </div>
        {caption && <p className="mt-3 font-mono text-[11.5px] leading-relaxed text-muted">{caption}</p>}
      </div>
    </article>
  );
}

function PruefungenMini() {
  const rows = [
    { d: "Di 18.09", n: "Mia Schäfer", a: "Praxis", o: "TÜV Nord", c: "text-mint" },
    { d: "Do 19.09", n: "Sophie Bauer", a: "Theorie", o: "TÜV Süd", c: "text-pylon" },
    { d: "Mo 23.09", n: "Ben Krüger", a: "Praxis", o: "DEKRA", c: "text-mint" },
    { d: "Mi 25.09", n: "Leon Fischer", a: "Praxis", o: "TÜV Nord", c: "text-mint" },
  ];
  return (
    <div className="bg-white p-4">
      <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted">
        <span>Anstehende Prüfungen</span>
        <span className="tnum">KW 38 – 39</span>
      </div>
      <div className="overflow-hidden rounded-md border border-line">
        {rows.map((r, i) => (
          <div key={r.n} className={cn("flex items-center gap-3 px-3.5 py-2.5 text-[12.5px]", i > 0 && "border-t border-line")}>
            <span className="tnum w-16 font-medium">{r.d}</span>
            <span className="min-w-0 flex-1 truncate">{r.n}</span>
            <span className={cn("font-medium", r.c)}>{r.a}</span>
            <span className="text-muted">{r.o}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Produkt() {
  return (
    <section id="produkt" className="bg-cream py-20 md:py-28">
      <Container wide>
        <ChapterHead
          num="02"
          label="Das Produkt"
          title="Alles, was eine Fahrschule braucht. Nichts, was sie nicht braucht."
          intro="Sechs Bereiche, ein System. Jede Ansicht ist so gebaut, dass man sie zwischen zwei Fahrstunden versteht – nicht erst nach einer Schulung."
        />

        <div className="mt-14 md:mt-20">
          <Spread
            index="02.1 — Disposition"
            title="Jede Fahrstunde dort, wo sie hingehört."
            text="Fahrlehrer, Fahrzeuge und Schüler auf einer klaren Zeitachse. Verfügbarkeiten, Prüfungen und Sperrzeiten inklusive – Konflikte erkennt das System, bevor sie entstehen."
            points={["Ressourcen-Board für Lehrer und Fahrzeuge", "Freie Slots auf einen Blick", "Prüfungen und Sperrzeiten berücksichtigt"]}
            tone="mint"
            caption="Disposition – Wochenansicht mit Fahrlehrern, Fahrzeugen und freien Slots."
          >
            <BrowserFrame url="app.fahrschulapp.de/disposition">
              <DispoMock />
            </BrowserFrame>
          </Spread>

          <Spread
            index="02.2 — Schülerakte"
            title="Jeder Schüler. Jede Info. Eine digitale Akte."
            text="Stammdaten, Ausbildungsfortschritt, Theorie, Praxis, Dokumente, Termine und Zahlungen – papierlos und immer aktuell. Der Ausbildungsnachweis läuft mit."
            points={["Fortschritt und Prüfungsreife automatisch", "Ausbildungsnachweis mit E-Signatur", "Unterlagen-Checkliste und Dokumente"]}
            tone="sand"
            reverse
            caption="Schülerakte – Fortschritt, Prüfungsreife und offene Posten je Schüler."
          >
            <BrowserFrame url="app.fahrschulapp.de/schueler">
              <SchuelerakteMock />
            </BrowserFrame>
          </Spread>

          <Spread
            index="02.3 — Finanzen"
            title="Finanzen, die nicht hinterherlaufen."
            text="Von der Rechnung über Ratenpläne bis zum Mahnwesen. Mit SEPA-Lastschrift, XRechnung und DATEV-Export ist der Zahlungsstatus jederzeit klar."
            points={["Rechnungen, Ratenpläne, Mahnwesen", "Offene Posten nach Alter", "SEPA · XRechnung · DATEV"]}
            tone="paper"
            caption="Finanzen – offene Posten, Zahlungseingänge und Mahnstufen."
          >
            <BrowserFrame url="app.fahrschulapp.de/finanzen">
              <FinanzenMock />
            </BrowserFrame>
          </Spread>

          <Spread
            id="schueler-app"
            index="02.4 — Schüler-App"
            title="Die Schüler sehen, was als Nächstes kommt."
            text="Termine, Fortschritt, Nachrichten, Zahlungen und Rechnungen – in einer eigenen App im Design deiner Fahrschule. Termine bestätigen die Schüler per Link."
            points={["Termine, Fortschritt und Zahlungen", "Online bezahlen, Termine bestätigen", "Weniger Rückfragen im Büro"]}
            tone="sand"
            reverse
            caption="Schüler-App – nächste Fahrstunde, Fortschritt und offene Rechnung."
          >
            <div className="relative md:pb-8 md:pr-16">
              <div className="relative aspect-[4/3] overflow-hidden rounded-sm">
                <Image
                  src="/images/schueler-lachen.jpg"
                  alt="Fahrschüler lacht am Steuer"
                  fill
                  sizes="(max-width: 768px) 100vw, 60vw"
                  className="object-cover"
                />
              </div>
              <div className="mt-6 md:absolute md:-bottom-2 md:right-0 md:mt-0">
                <PhoneMock />
              </div>
            </div>
          </Spread>

          <Spread
            index="02.5 — Prüfungen & Cockpit"
            title="Wer ist bereit? Wo musst du hinschauen?"
            text="Theoriefortschritt, Prüfungstermine und offene Voraussetzungen an einem Ort. Und das Chef-Cockpit zeigt Auslastung, No-Show-Quote und offene Posten – bevor du danach suchen musst."
            points={["Prüfungstermine und Status je Schüler", "Auslastung je Fahrlehrer und Fahrzeug", "No-Show-Quote in Echtzeit"]}
            tone="mint"
            caption="Links: anstehende Prüfungen. Rechts: Chef-Cockpit mit Auslastung und offenen Posten."
          >
            <div className="grid gap-4 lg:grid-cols-[1fr_1.25fr]">
              <BrowserFrame url="app.fahrschulapp.de/pruefungen">
                <PruefungenMini />
              </BrowserFrame>
              <BrowserFrame url="app.fahrschulapp.de/cockpit">
                <CockpitMock />
              </BrowserFrame>
            </div>
          </Spread>
        </div>
      </Container>
    </section>
  );
}

const DOSSIER = [
  {
    n: "2",
    tag: "Spart Geld",
    t: "No-Show-Killer",
    d: "Automatische Erinnerungen per WhatsApp, SMS und E-Mail – mit Zusage- und Absage-Link. Weniger leere Sitze, weniger Nachtelefonieren.",
  },
  {
    n: "3",
    tag: "Spart Zeit",
    t: "Smart-Disposition",
    d: "Die nächste sinnvolle Fahrstunde auf einen Klick – inklusive freiem Slot, passendem Fahrlehrer und Fahrzeug.",
  },
  {
    n: "4",
    tag: "Voller Überblick",
    t: "Chef-Cockpit",
    d: "Die wichtigsten Zahlen, bevor du danach suchen musst: Auslastung, Ausfälle, offene Posten nach Alter.",
  },
];

export function Dossier() {
  return (
    <section id="highlights" className="grain grain-dark bg-ink py-20 text-cream md:py-28">
      <Container wide className="relative z-[2]">
        <ChapterHead
          light
          num="03"
          label="Was es nur hier gibt"
          title="Vier Dinge, die deine Fahrschule spürbar entspannter machen."
          intro="Funktionen, die andere Fahrschul-Programme so nicht haben – und die im Alltag Zeit und Geld sparen."
        />

        <div className="mt-16 grid gap-10 border-t border-cream/15 pt-12 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-5" data-reveal>
            <span className="tnum font-display text-[72px] leading-none text-mint-hi">1</span>
            <span className="mt-5 block font-mono text-[12px] uppercase tracking-[0.16em] text-mint-hi">KI-Assistent · Neu</span>
            <h3 className="mt-3 font-display text-[clamp(28px,3vw,42px)] leading-[1.06] text-balance">Sag einfach, was passieren soll.</h3>
            <p className="mt-5 max-w-[46ch] text-[16.5px] leading-[1.6] text-cream/70">
              Der Assistent kennt den Kontext deiner Fahrschule und schlägt passende Aktionen vor – vom Termin planen bis zur Rechnung.
              Ausgeführt wird erst, wenn du bestätigst.
            </p>
          </div>
          <div className="md:col-span-7 lg:col-span-6 lg:col-start-7" data-reveal data-delay="90ms">
            <div className="overflow-hidden rounded-lg border border-cream/15 bg-white text-ink shadow-[0_40px_80px_-40px_rgba(0,0,0,.7)]">
              <ChatMock />
            </div>
            <p className="mt-3 font-mono text-[11.5px] text-cream/50">Assistent in der Software – Beispielgespräch.</p>
          </div>
        </div>

        <div className="mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
          {DOSSIER.map((c, i) => (
            <div key={c.n} className="border-t border-cream/15 pt-6" data-reveal data-delay={`${i * 70}ms`}>
              <div className="flex items-baseline justify-between">
                <span className="tnum font-display text-[52px] leading-none text-mint-hi">{c.n}</span>
                <span className="font-mono text-[11.5px] uppercase tracking-[0.14em] text-cream/50">{c.tag}</span>
              </div>
              <h3 className="mt-5 font-display text-[26px] leading-tight">{c.t}</h3>
              <p className="mt-3 text-[15.5px] leading-[1.6] text-cream/65">{c.d}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
