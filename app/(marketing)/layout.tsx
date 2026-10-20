import type { Metadata } from "next";
import { Barlow_Condensed, Plus_Jakarta_Sans } from "next/font/google";

import "./marketing.css";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { StickyCta } from "@/components/marketing/sticky-cta";
import { Reveal } from "@/components/marketing/reveal";

// Eigene Schriften nur für die Website – die App behält Geist.
const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-mk-sans", display: "swap" });
const display = Barlow_Condensed({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-display", display: "swap" });

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.fahrschulapp.de";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "FahrschulApp – Fahrschulsoftware mit Disposition, Schülerakte, Finanzen & Schüler-App",
    template: "%s · FahrschulApp",
  },
  description:
    "Die Fahrschulsoftware, die dir das Büro abnimmt: Disposition, Schülerakte, Finanzen, Prüfungen und Schüler-App in einem System – mit KI-Assistent und automatischen Terminerinnerungen. DSGVO-konform, Server in Deutschland.",
  keywords: ["Fahrschulsoftware", "Fahrschule Software", "Fahrschulverwaltung", "Disposition Fahrschule", "Fahrschul-App", "Fahrschulprogramm"],
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: SITE,
    siteName: "FahrschulApp",
    title: "FahrschulApp – Weniger Büro. Mehr Fahrstunden.",
    description: "Disposition, Schülerakte, Finanzen, Prüfungen und Schüler-App in einem System.",
  },
  robots: { index: true, follow: true },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`mk ${sans.variable} ${display.variable} min-h-screen bg-white font-mk text-ink`}>
      <a
        href="#inhalt"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
      >
        Zum Inhalt springen
      </a>
      <SiteHeader />
      <main id="inhalt">{children}</main>
      <SiteFooter />
      <StickyCta />
      <Reveal />
    </div>
  );
}
