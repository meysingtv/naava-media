import type { Metadata } from "next";
import { Barlow_Condensed, Plus_Jakarta_Sans } from "next/font/google";

import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { StickyCta } from "@/components/sticky-cta";
import { Reveal } from "@/components/reveal";

// Kräftige, freundliche Grotesk fürs Ganze; enge Versalien für große Banner.
const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-display",
  display: "swap",
});

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
  alternates: { canonical: "/" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${sans.variable} ${display.variable}`}>
      <body>
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
      </body>
    </html>
  );
}
