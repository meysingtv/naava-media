import Image from "next/image";

import { Btn, Container, TextLink, cn } from "@/components/ui";
import { ChapterHead } from "@/components/home/chapters";
import { RouteMark } from "@/components/home/marks";

function Photo({
  src,
  alt,
  cap,
  num,
  ratio,
  className,
  sizes = "(max-width: 768px) 100vw, 40vw",
}: {
  src: string;
  alt: string;
  cap: string;
  num: string;
  ratio: string;
  className?: string;
  sizes?: string;
}) {
  return (
    <figure className={cn("group", className)} data-reveal>
      <div className={cn("relative overflow-hidden rounded-sm", ratio)}>
        <Image src={src} alt={alt} fill sizes={sizes} className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]" />
      </div>
      <figcaption className="mt-3 flex items-start justify-between gap-4 font-mono text-[11.5px] leading-relaxed text-muted">
        <span>{cap}</span>
        <span className="tnum shrink-0">Abb. {num}</span>
      </figcaption>
    </figure>
  );
}

export function Bildstrecke() {
  return (
    <section id="bildstrecke" className="bg-cream py-20 md:py-28">
      <Container wide>
        <ChapterHead
          num="04"
          label="Bildstrecke"
          title="Aus dem Alltag."
          intro="Fahrstunden, Übungsplatz, Schlüsselübergabe. Das, worum es eigentlich geht – und was die Software im Hintergrund frei räumt."
        />
      </Container>

      <figure className="mt-14 md:mt-20" data-reveal>
        <div className="relative aspect-[16/10] overflow-hidden sm:aspect-[16/8] md:aspect-[21/9]">
          <Image
            src="/images/lektion-steuer.jpg"
            alt="Fahrschüler am Steuer, die Fahrlehrerin zeigt nach vorn"
            fill
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <Container wide>
          <figcaption className="mt-3 flex items-start justify-between gap-6 font-mono text-[11.5px] leading-relaxed text-muted">
            <span>Erste Stunde in der Stadt. Die nächste steht schon im Plan.</span>
            <span className="tnum shrink-0">Abb. 03</span>
          </figcaption>
        </Container>
      </figure>

      <Container wide>
        <div className="mt-16 grid gap-8 md:grid-cols-12 md:gap-8">
          <Photo
            className="md:col-span-5"
            src="/images/schilder.jpg"
            alt="Zwei Fahrschulwagen mit blauen L-Schildern auf dem Dach"
            ratio="aspect-[4/5]"
            cap="Zwei Fahrschulwagen, eine Frage: Wer fährt wann mit wem?"
            num="04"
          />
          <Photo
            className="md:col-span-4 md:mt-20"
            src="/images/schluessel.jpg"
            alt="Schlüsselübergabe im Auto"
            ratio="aspect-[4/5]"
            cap="Schlüsselübergabe nach bestandener Prüfung."
            num="05"
          />
          <Photo
            className="md:col-span-3 md:mt-40"
            src="/images/fahrlehrerin.jpg"
            alt="Fahrlehrer erklärt einer Fahrschülerin das Fahrzeug"
            ratio="aspect-[3/4]"
            cap="Erklären, zuhören, noch einmal fahren."
            num="06"
            sizes="(max-width: 768px) 100vw, 25vw"
          />
        </div>

        <div className="mt-20 grid gap-10 md:mt-28 md:grid-cols-12 md:items-end md:gap-8">
          <p className="font-display text-[clamp(28px,4vw,56px)] italic leading-[1.08] text-ink text-balance md:col-span-7" data-reveal>
            Die beste Software ist die, die man im Auto nicht braucht.
          </p>
          <div className="grid grid-cols-2 gap-4 md:col-span-5">
            <Photo src="/images/lenkrad.jpg" alt="Hände am Lenkrad" ratio="aspect-square" cap="Hände am Lenkrad." num="07" sizes="20vw" />
            <Photo src="/images/strasse.jpg" alt="Allee mit leerer Straße" ratio="aspect-square" cap="Allee, Übungsstrecke." num="08" sizes="20vw" />
          </div>
        </div>
      </Container>
    </section>
  );
}

const STEPS = [
  { n: "01", t: "Demo ansehen", d: "Wir zeigen dir FahrschulApp anhand deines Alltags – nicht anhand einer Folie." },
  { n: "02", t: "Fahrschule einrichten", d: "Zugänge, Fahrlehrer und Fahrzeuge anlegen. Das dauert Minuten, keine Wochen." },
  { n: "03", t: "Daten übernehmen", d: "Bestehende Schüler und Termine ziehen wir gemeinsam mit dir um." },
  { n: "04", t: "Loslegen", d: "Planen, abrechnen, Kopf frei haben. Der Support bleibt persönlich." },
];

export function Ablauf() {
  return (
    <section id="ablauf" className="grain relative overflow-hidden bg-mint py-20 text-cream md:py-28">
      <RouteMark className="text-cream/20" />
      <Container wide className="relative z-[2]">
        <ChapterHead light num="05" label="So startest du" title="In vier Schritten im Betrieb." />
        <ol className="mt-14 grid gap-10 md:mt-20 md:grid-cols-4 md:gap-0">
          {STEPS.map((s, i) => (
            <li key={s.n} className="md:border-l md:border-cream/25 md:px-8 md:first:border-l-0 md:first:pl-0" data-reveal data-delay={`${i * 80}ms`}>
              <span className="tnum font-display text-[clamp(56px,6vw,84px)] leading-none text-mint-hi">{s.n}</span>
              <h3 className="mt-6 font-display text-[24px] leading-tight">{s.t}</h3>
              <p className="mt-3 text-[15.5px] leading-[1.6] text-cream/75">{s.d}</p>
            </li>
          ))}
        </ol>
        <div className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-cream/25 pt-8">
          <Btn href="/demo" variant="light" size="lg" arrow>
            Demo anfordern
          </Btn>
          <TextLink light href="/funktionen">
            Alle Funktionen im Detail
          </TextLink>
        </div>
      </Container>
    </section>
  );
}

const STATS = [
  { v: "−30 %", l: "Terminausfälle", d: "Weniger leere Sitze durch Erinnerungen mit Zu- und Absage-Link." },
  { v: "5 → 1", l: "Kanäle", d: "Telefon, Excel, Papier, Chat und Kalender werden ein System." },
  { v: "0", l: "Papierakten", d: "Digitale Schülerakte inklusive Ausbildungsnachweis und E-Signatur." },
  { v: "100 %", l: "Überblick", d: "Termine, Auslastung und offene Posten auf einen Blick." },
];

const FRUEHER = ["Excel und Papier", "Mehrere Kalender", "Telefon-Pingpong", "Manuelle Erinnerungen", "Verstreute Informationen", "Kein echter Überblick"];
const HEUTE = ["Zentrale Disposition", "Digitale Schülerakte", "Automatische Erinnerungen", "Integrierte Finanzen", "Schüler-App", "Chef-Cockpit und KI-Assistent"];

export function Wirkung() {
  return (
    <section id="wirkung" className="relative overflow-hidden bg-ink py-20 text-cream md:py-28">
      <Image src="/images/kurve.jpg" alt="" aria-hidden fill sizes="100vw" className="object-cover opacity-[0.22]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink via-ink/75 to-ink" aria-hidden />
      <Container wide className="relative z-[2]">
        <ChapterHead light num="07" label="Wirkung" title="Was sich ändert, wenn das Büro kleiner wird." />

        <dl className="mt-14 grid gap-10 border-t border-cream/15 pt-10 md:mt-20 md:grid-cols-4 md:gap-8">
          {STATS.map((s, i) => (
            <div key={s.l} className="md:border-l md:border-cream/15 md:pl-6 md:first:border-l-0 md:first:pl-0" data-reveal data-delay={`${i * 70}ms`}>
              <dt className="font-mono text-[11.5px] uppercase tracking-[0.14em] text-cream/55">{s.l}</dt>
              <dd className="tnum mt-4 font-display text-[clamp(44px,5.4vw,76px)] leading-none text-mint-hi">{s.v}</dd>
              <dd className="mt-4 text-[14.5px] leading-[1.6] text-cream/65">{s.d}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-8 font-mono text-[11.5px] text-cream/45">Beispielhafte Wirkung – keine veröffentlichten Kundendaten.</p>

        <div className="mt-20 grid gap-12 border-t border-cream/15 pt-12 md:grid-cols-2 md:gap-16">
          <div data-reveal>
            <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-cream/50">Früher</span>
            <ul className="mt-5">
              {FRUEHER.map((p) => (
                <li key={p} className="flex items-center gap-4 border-b border-cream/10 py-3.5 text-[17px] text-cream/55">
                  <span className="font-mono text-[13px] text-cream/35" aria-hidden>
                    ×
                  </span>
                  <span className="line-through decoration-cream/30 decoration-1">{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <div data-reveal data-delay="90ms">
            <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-mint-hi">Mit FahrschulApp</span>
            <ul className="mt-5">
              {HEUTE.map((p) => (
                <li key={p} className="flex items-center gap-4 border-b border-cream/15 py-3.5 font-display text-[21px] text-cream">
                  <span className="font-mono text-[13px] text-mint-hi" aria-hidden>
                    →
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}
