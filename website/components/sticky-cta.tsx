"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Arrow, cn } from "@/components/ui";

/** Schwebender Demo-Button, erscheint nach dem ersten Scrollen – nicht auf Formularseiten. */
export function StickyCta() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (pathname === "/demo" || pathname === "/kontakt") return null;

  return (
    <Link
      href="/demo"
      className={cn(
        "fixed bottom-5 right-5 z-40 inline-flex h-[52px] items-center gap-2 rounded-full bg-orange px-5 text-[15px] font-bold text-white shadow-cta transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-dark",
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
      )}
    >
      Demo anfordern <Arrow />
    </Link>
  );
}
