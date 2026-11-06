import type { Metadata } from "next";

import { CtaBand } from "@/components/marketing/bits";
import { PageHero } from "@/components/marketing/page-hero";
import { Modules } from "@/components/marketing/home/modules";
import { FeatureRows } from "@/components/marketing/home/rows";
import { Highlights } from "@/components/marketing/home/highlights";
import { AppShot, LaptopFrame } from "@/components/marketing/mockups";

export const metadata: Metadata = {
  title: "Funktionen",
  description:
    "Disposition, Schülerverwaltung, Finanzen, Theorie & Prüfungen, Schüler-App und Chef-Cockpit – alle Funktionen von FahrschulApp im Überblick.",
  alternates: { canonical: "/funktionen" },
};

export default function FunktionenPage() {
  return (
    <>
      <PageHero
        eyebrow="Funktionen"
        title="Alles, was den Fahrschulalltag leichter macht."
        sub="Von der Disposition bis zur Abrechnung – ein System, das zusammenarbeitet, statt gegeneinander. Hier siehst du jedes Modul im Detail."
        cta
      >
        <LaptopFrame className="max-w-[560px]">
          <AppShot src="/images/app/leitstand.jpg" alt="FahrschulApp Dashboard mit Terminen, Aufgaben, Prüfungen und Finanzstatus" priority />
        </LaptopFrame>
      </PageHero>
      <Modules />
      <FeatureRows />
      <Highlights />
      <CtaBand compact />
    </>
  );
}
