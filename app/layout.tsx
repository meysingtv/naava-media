import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

/**
 * Schrift v3: Inter als einzige Schrift der App. Acht Stufen, drei Gewichte
 * (400/500/600), Zahlen tabellarisch (global in globals.css gesetzt).
 */
const sans = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "FahrschulApp",
    template: "%s",
  },
  description:
    "Moderne Verwaltung für Fahrschulen: Schüler, Kalender, Rechnungen und Team an einem Ort.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className={`${sans.variable} font-sans antialiased`}>
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
