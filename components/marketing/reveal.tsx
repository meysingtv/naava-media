"use client";

import { useEffect } from "react";

/**
 * Blendet Elemente mit [data-reveal] beim Scrollen sanft ein und schaltet für
 * die Website weiches Scrollen zu Ankern ein (nur solange die Seite offen ist).
 */
export function Reveal() {
  useEffect(() => {
    const html = document.documentElement;
    const vorher = html.style.scrollBehavior;
    html.style.scrollBehavior = "smooth";

    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    let io: IntersectionObserver | null = null;
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      els.forEach((el) => el.classList.add("in"));
    } else {
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              (e.target as HTMLElement).style.transitionDelay = (e.target as HTMLElement).dataset.delay || "0ms";
              e.target.classList.add("in");
              io?.unobserve(e.target);
            }
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
      );
      els.forEach((el) => io?.observe(el));
    }
    return () => {
      io?.disconnect();
      html.style.scrollBehavior = vorher;
    };
  }, []);
  return null;
}
