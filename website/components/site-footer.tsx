import Link from "next/link";

import { Container } from "@/components/ui";
import { Wordmark } from "@/components/site-header";

const COLS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Produkt",
    links: [
      { href: "/funktionen", label: "Funktionen" },
      { href: "/#highlights", label: "Highlights" },
      { href: "/#schueler-app", label: "Schüler-App" },
      { href: "/demo", label: "Demo anfordern" },
    ],
  },
  {
    title: "Unternehmen",
    links: [
      { href: "/ueber-uns", label: "Über uns" },
      { href: "/kontakt", label: "Kontakt" },
      { href: "/#sicherheit", label: "Sicherheit & DSGVO" },
    ],
  },
  {
    title: "Rechtliches",
    links: [
      { href: "/impressum", label: "Impressum" },
      { href: "/datenschutz", label: "Datenschutz" },
      { href: "/agb", label: "AGB" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="grain grain-dark bg-ink text-cream/70">
      <Container wide className="relative z-[2] pb-10 pt-16 md:pt-20">
        {/* Große Wortmarke – wie die Rückseite eines Hefts */}
        <p className="select-none font-display text-[clamp(52px,11vw,168px)] font-medium leading-[0.9] tracking-[-0.03em] text-cream" aria-hidden>
          FahrschulApp
        </p>

        <div className="mt-12 grid gap-12 border-t border-cream/15 pt-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Wordmark light />
            <p className="mt-5 max-w-[34ch] text-[15px] leading-[1.6] text-cream/55">
              Software für Fahrschulen, die lieber fahren als verwalten. Gemacht und gehostet in Deutschland.
            </p>
          </div>
          {COLS.map((c) => (
            <div key={c.title}>
              <h4 className="font-mono text-[11.5px] uppercase tracking-[0.16em] text-cream/50">{c.title}</h4>
              <ul className="mt-5 space-y-3">
                {c.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link href={l.href} className="text-[15.5px] text-cream/75 transition-colors hover:text-cream">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-cream/15 pt-6 font-mono text-[11.5px] uppercase tracking-[0.12em] text-cream/40 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} FahrschulApp</span>
          <span className="flex flex-wrap items-center gap-5">
            <span>Made in Germany</span>
            <span>DSGVO-orientiert</span>
            <span className="text-cream/25">Social · folgt</span>
          </span>
        </div>
      </Container>
    </footer>
  );
}
