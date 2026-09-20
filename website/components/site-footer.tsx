import Link from "next/link";
import { Lock, MapPin, ShieldCheck } from "lucide-react";

import { Container } from "@/components/ui";
import { Logo } from "@/components/site-header";

const COLS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Produkt",
    links: [
      { href: "/#module", label: "Module" },
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
      { href: "/#faq", label: "FAQ" },
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

const BADGES = [
  { icon: ShieldCheck, t: "DSGVO-konform" },
  { icon: MapPin, t: "Server in Deutschland" },
  { icon: Lock, t: "Verschlüsselte Übertragung" },
];

export function SiteFooter() {
  return (
    <footer className="bg-dark text-white/70">
      <Container className="pb-10 pt-16">
        <div className="grid gap-12 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo light />
            <p className="mt-5 max-w-[36ch] text-[15px] leading-relaxed text-white/60">
              Die Fahrschulsoftware, die dir das Büro abnimmt. Gründer-geführt, in Deutschland gebaut und gehostet.
            </p>
            <ul className="mt-6 flex flex-wrap gap-2">
              {BADGES.map((b) => (
                <li key={b.t} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-[12.5px] font-semibold text-white/80">
                  <b.icon className="h-3.5 w-3.5 text-brand-accent" /> {b.t}
                </li>
              ))}
            </ul>
          </div>
          {COLS.map((c) => (
            <div key={c.title}>
              <h4 className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-white">{c.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link href={l.href} className="text-[15px] text-white/65 transition-colors hover:text-white">
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
            <span>Reform 2027 ready</span>
          </span>
        </div>
      </Container>
    </footer>
  );
}
