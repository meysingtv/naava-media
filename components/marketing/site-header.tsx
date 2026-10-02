"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, Menu, Sparkles, X } from "lucide-react";

import { Btn, cn } from "@/components/marketing/ui";

const NAV = [
  { href: "/#module", label: "Module" },
  { href: "/funktionen", label: "Funktionen" },
  { href: "/#highlights", label: "Highlights" },
  { href: "/#ablauf", label: "Ablauf" },
  { href: "/#faq", label: "FAQ" },
  { href: "/ueber-uns", label: "Über uns" },
];

export function Logo({ onClick, light }: { onClick?: () => void; light?: boolean }) {
  return (
    <Link href="/" onClick={onClick} className="flex items-center gap-2.5" aria-label="FahrschulApp – Startseite">
      <span className="grid h-9 w-9 place-items-center rounded-[12px] bg-brand text-white">
        <CalendarClock className="h-[20px] w-[20px]" strokeWidth={2.2} />
      </span>
      <span className={cn("text-[21px] font-extrabold tracking-[-0.02em]", light ? "text-white" : "text-ink")}>
        Fahrschul<span className="text-brand-accent">App</span>
      </span>
    </Link>
  );
}

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [angemeldet, setAngemeldet] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => void (document.body.style.overflow = "");
  }, [open]);

  // Angemeldete Nutzer bekommen statt „Login" den Sprung ins Dashboard.
  // Die Session wird lokal aus dem Cookie gelesen – kein Netzwerk-Roundtrip.
  useEffect(() => {
    let aktiv = true;
    import("@/lib/supabase/client")
      .then(({ createClient }) => createClient().auth.getSession())
      .then(({ data }) => {
        if (aktiv) setAngemeldet(Boolean(data.session?.user));
      })
      .catch(() => {});
    return () => {
      aktiv = false;
    };
  }, []);

  const loginHref = angemeldet ? "/dashboard" : "/login";
  const loginLabel = angemeldet ? "Zum Dashboard" : "Login";

  return (
    <>
      {/* Info-Leiste */}
      <div className="bg-dark text-white">
        <div className="mx-auto flex max-w-wrap items-center justify-between gap-4 px-5 py-2 text-[12.5px] font-semibold sm:px-8">
          <span className="inline-flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-brand-accent" />
            <span className="rounded-full bg-orange px-2 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wider">Neu</span>
            KI-Assistent und Reform-2027-ready
          </span>
          <span className="hidden text-white/70 sm:inline">Persönliche Demo · Antwort innerhalb von 24 h</span>
        </div>
      </div>

      <header className={cn("sticky top-0 z-50 bg-white transition-shadow duration-200", scrolled || open ? "shadow-[0_8px_30px_-18px_rgba(15,26,21,.35)]" : "border-b border-line")}>
        <div className="mx-auto flex h-[72px] max-w-wrap items-center gap-6 px-5 sm:px-8">
          <Logo />
          <nav className="ml-4 hidden items-center gap-6 lg:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="text-[15px] font-bold text-ink/70 transition-colors hover:text-brand">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto hidden items-center gap-3 lg:flex">
            <Link href={loginHref} className="rounded-full border-2 border-line px-5 py-2.5 text-[14.5px] font-bold text-ink transition-colors hover:border-ink">
              {loginLabel}
            </Link>
            <Btn href="/demo" size="md" arrow>
              Demo anfordern
            </Btn>
          </div>
          <button
            className="ml-auto grid h-11 w-11 place-items-center rounded-[12px] border-2 border-line lg:hidden"
            aria-label={open ? "Menü schließen" : "Menü öffnen"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <div className="border-t border-line bg-white lg:hidden">
            <nav className="flex flex-col px-5 py-2">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="border-b border-line py-4 text-[18px] font-bold text-ink">
                  {n.label}
                </Link>
              ))}
              <div className="flex gap-3 pt-5">
                <Link href={loginHref} onClick={() => setOpen(false)} className="flex h-12 flex-1 items-center justify-center rounded-full border-2 border-line font-bold">
                  {loginLabel}
                </Link>
                <Link href="/demo" onClick={() => setOpen(false)} className="flex h-12 flex-1 items-center justify-center rounded-full bg-orange font-bold text-white shadow-cta">
                  Demo anfordern
                </Link>
              </div>
              {!angemeldet && (
                <p className="py-4 text-center text-[14px] text-ink-muted">
                  Neu hier?{" "}
                  <Link href="/register" onClick={() => setOpen(false)} className="font-bold text-brand">
                    Kostenlos registrieren
                  </Link>
                </p>
              )}
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
