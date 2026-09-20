import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.fahrschulapp.de";

// Nur die Marketing-Seiten sind für Suchmaschinen gedacht; App, Portal und
// Auth bleiben draußen.
const APP_BEREICHE = [
  "/auth",
  "/portal",
  "/api",
  "/t/",
  "/dashboard",
  "/aufgaben",
  "/berichte",
  "/buchhaltung",
  "/cockpit",
  "/einstellungen",
  "/erinnerungen",
  "/fahrlehrer",
  "/fahrzeuge",
  "/finanzen",
  "/hilfe",
  "/kalender",
  "/kommunikation",
  "/kostentraeger",
  "/kurse",
  "/lohn",
  "/pruefungen",
  "/rechnungen",
  "/rechnungslauf",
  "/schueler",
  "/theorie",
  "/zahlungen",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: APP_BEREICHE },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
