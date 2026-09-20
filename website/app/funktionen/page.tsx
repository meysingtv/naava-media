import type { Metadata } from "next";

import { CtaBand } from "@/components/bits";
import { PageHero } from "@/components/page-hero";
import { Modules } from "@/components/home/modules";
import { FeatureRows } from "@/components/home/rows";
import { Highlights } from "@/components/home/highlights";
import { LaptopFrame, DashboardMock } from "@/components/mockups";

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
          <DashboardMock />
        </LaptopFrame>
      </PageHero>
      <Modules />
      <FeatureRows />
      <Highlights />
      <CtaBand compact />
    </>
  );
}
