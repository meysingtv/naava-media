"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, Menu, X } from "lucide-react";

import { Btn, cn } from "@/components/ui";

const NAV = [
  { href: "/funktionen", label: "Funktionen" },
  { href: "/#highlights", label: "Highlights" },
  { href: "/ueber-uns", label: "Über uns" },
];

function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <Link href="/" onClick={onClick} className="flex items-center gap-2.5" aria-label="FahrschulApp Startseite">
      <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-mint text-white">
        <CalendarClock className="h-[18px] w-[18px]" strokeWidth={2} />
      </span>
      <span className="font-display text-[20px] font-extrabold tracking-tight text-ink">
        Fahrschul<span className="text-mint">App</span>
      </span>
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
        "sticky top-0 z-50 transition-all duration-200",
        scrolled ? "border-b border-line bg-white/85 backdrop-blur-md" : "border-b border-transparent bg-white/0",
      )}
    >
      <div className={cn("mx-auto flex max-w-wrap items-center gap-6 px-6 transition-all duration-200 md:px-8", scrolled ? "h-16" : "h-[76px]")}>
        <Logo />
        <nav className="ml-2 hidden items-center gap-7 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-[15px] font-medium text-muted transition-colors hover:text-ink">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-3 md:flex">
          <Link href="/#" className="text-[15px] font-semibold text-ink/80 transition-colors hover:text-ink">
            Anmelden
          </Link>
          <Btn href="/demo" size="md">
            Demo anfordern
          </Btn>
        </div>
        <button
          className="ml-auto grid h-11 w-11 place-items-center rounded-xl border border-line2 bg-white md:hidden"
          aria-label={open ? "Menü schließen" : "Menü öffnen"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-line bg-white md:hidden">
          <nav className="flex flex-col px-6 py-2">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="border-b border-line py-4 text-[17px] font-medium text-ink">
                {n.label}
              </Link>
            ))}
            <div className="flex gap-3 py-4">
              <Link href="/#" onClick={() => setOpen(false)} className="flex h-12 flex-1 items-center justify-center rounded-xl border border-line2 font-semibold">
                Anmelden
              </Link>
              <Link
                href="/demo"
                onClick={() => setOpen(false)}
                className="flex h-12 flex-1 items-center justify-center rounded-xl bg-mint font-semibold text-white"
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
