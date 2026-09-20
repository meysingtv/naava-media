import type { Metadata } from "next";
import { Fraunces, Hanken_Grotesk, IBM_Plex_Mono } from "next/font/google";

import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Reveal } from "@/components/reveal";

// Editoriale Serifenschrift für Überschriften, ruhige Grotesk fürs Lesen,
// Mono für Zahlen, Bildunterschriften und Meta-Zeilen.
const display = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-display",
  display: "swap",
});
const sans = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.fahrschulapp.de";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "FahrschulApp – Software für Fahrschulen, die lieber fahren als verwalten",
    template: "%s · FahrschulApp",
  },
  description:
    "Disposition, Schülerakte, Finanzen, Prüfungen und Schüler-App in einer ruhigen Software. FahrschulApp nimmt dem Fahrschulalltag das Büro ab – mit KI-Assistent und automatischen Erinnerungen.",
  keywords: ["Fahrschulsoftware", "Fahrschule Software", "Fahrschulverwaltung", "Disposition Fahrschule", "Fahrschul-App"],
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: SITE,
    siteName: "FahrschulApp",
    title: "FahrschulApp – Software für Fahrschulen, die lieber fahren als verwalten",
    description: "Alle Termine. Alle Schüler. Alle Zahlen. Ein System.",
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <a
          href="#inhalt"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-cream"
        >
          Zum Inhalt springen
        </a>
        <SiteHeader />
        <main id="inhalt">{children}</main>
        <SiteFooter />
        <Reveal />
      </body>
    </html>
  );
}
