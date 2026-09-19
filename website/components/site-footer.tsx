import Link from "next/link";
import { CalendarClock } from "lucide-react";

import { Container } from "@/components/ui";

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
    <footer className="bg-ink text-white/70">
      <Container className="py-16">
        <div className="grid gap-12 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5 text-white">
              <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-mint text-white">
                <CalendarClock className="h-[18px] w-[18px]" strokeWidth={2} />
              </span>
              <span className="font-display text-[20px] font-extrabold tracking-tight">
                Fahrschul<span className="text-mint-accent">App</span>
              </span>
            </Link>
            <p className="mt-4 max-w-[34ch] text-[15px] leading-relaxed text-white/55">
              Die Software für den modernen Fahrschulalltag. Weniger organisieren, mehr Fahrschule.
            </p>
          </div>
          {COLS.map((c) => (
            <div key={c.title}>
              <h4 className="text-[14px] font-semibold text-white">{c.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link href={l.href} className="text-[15px] text-white/60 transition-colors hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-col gap-3 border-t border-white/10 pt-6 text-[13.5px] text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} FahrschulApp. Alle Rechte vorbehalten.</span>
          <span className="flex flex-wrap items-center gap-4">
            <span>Made in Germany</span>
            <span aria-hidden>·</span>
            <span>DSGVO-orientiert</span>
            <span aria-hidden>·</span>
            <span className="text-white/35">Social-Links (Platzhalter)</span>
          </span>
        </div>
      </Container>
    </footer>
  );
}
