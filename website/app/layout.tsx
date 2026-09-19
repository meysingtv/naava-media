import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";

import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Reveal } from "@/components/reveal";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});
const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.fahrschulapp.de";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "FahrschulApp – Software für moderne Fahrschulen",
    template: "%s · FahrschulApp",
  },
  description:
    "Disposition, Schülerverwaltung, Finanzen, Prüfungen und Schüler-App in einer Software. FahrschulApp digitalisiert den Fahrschulalltag – mit KI-Assistent und automatischen Erinnerungen.",
  keywords: ["Fahrschulsoftware", "Fahrschule Software", "Fahrschulverwaltung", "Disposition Fahrschule", "Fahrschul-App"],
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: SITE,
    siteName: "FahrschulApp",
    title: "FahrschulApp – Software für moderne Fahrschulen",
    description: "Alle Termine. Alle Schüler. Alle Zahlen. Ein System.",
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${display.variable} ${sans.variable}`}>
      <body>
        <a
          href="#inhalt"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-mint focus:px-4 focus:py-2 focus:text-white"
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
