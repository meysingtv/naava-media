"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { Btn, cn } from "@/components/ui";

const NAV = [
  { href: "/funktionen", label: "Funktionen" },
  { href: "/#highlights", label: "Highlights" },
  { href: "/ueber-uns", label: "Über uns" },
];

/** Wortmarke in Serife + kleines Routen-Zeichen. */
export function Wordmark({ className, light, onClick }: { className?: string; light?: boolean; onClick?: () => void }) {
  return (
    <Link href="/" onClick={onClick} className={cn("group inline-flex items-center gap-2.5", className)} aria-label="FahrschulApp – Startseite">
      <span className={cn("grid h-7 w-7 place-items-center rounded-[4px]", light ? "bg-cream text-ink" : "bg-mint text-cream")} aria-hidden>
        <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
          <path d="M3 15c3 0 3-9 7-9s4 8 7 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="1 3" />
          <circle cx="10" cy="6" r="1.6" fill="currentColor" />
        </svg>
      </span>
      <span className={cn("font-display text-[22px] font-medium tracking-[-0.01em]", light ? "text-cream" : "text-ink")}>FahrschulApp</span>
    </Link>
  );
}

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => void (document.body.style.overflow = "");
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-colors duration-200",
        scrolled || open ? "border-b border-line bg-cream/95 backdrop-blur-md" : "border-b border-transparent bg-cream/0",
      )}
    >
      <div className="mx-auto flex h-[68px] max-w-[1560px] items-center gap-8 px-5 sm:px-8 lg:px-12">
        <Wordmark />
        <nav className="ml-4 hidden items-center gap-7 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="font-mono text-[12px] uppercase tracking-[0.16em] text-ink/70 transition-colors hover:text-ink"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-6 md:flex">
          <Link href="/#" className="font-mono text-[12px] uppercase tracking-[0.16em] text-ink/70 transition-colors hover:text-ink">
            Anmelden
          </Link>
          <Btn href="/demo" size="md" arrow>
            Demo anfordern
          </Btn>
        </div>
        <button
          className="ml-auto grid h-11 w-11 place-items-center rounded-md border border-ink/20 md:hidden"
          aria-label={open ? "Menü schließen" : "Menü öffnen"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-line bg-cream md:hidden">
          <nav className="flex flex-col px-5 py-2">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="border-b border-line py-4 font-display text-[26px] text-ink"
              >
                {n.label}
              </Link>
            ))}
            <div className="flex gap-3 py-5">
              <Link
                href="/#"
                onClick={() => setOpen(false)}
                className="flex h-12 flex-1 items-center justify-center rounded-md border border-ink/25 font-medium"
              >
                Anmelden
              </Link>
              <Link
                href="/demo"
                onClick={() => setOpen(false)}
                className="flex h-12 flex-1 items-center justify-center rounded-md bg-ink font-medium text-cream"
              >
                Demo anfordern
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
