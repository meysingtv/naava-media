import { CtaBand } from "@/components/bits";
import { Hero, LogoStrip, PhotoBanner, TrustTiles } from "@/components/home/hero";
import { Modules } from "@/components/home/modules";
import { FeatureRows } from "@/components/home/rows";
import { Highlights } from "@/components/home/highlights";
import { Ablauf, Pilot, Wirkung } from "@/components/home/ablauf";
import { Faq } from "@/components/home/faq";

export default function HomePage() {
  return (
    <>
      <Hero />
      <TrustTiles />
      <LogoStrip />
      <Modules />
      <FeatureRows />
      <PhotoBanner />
      <Highlights />
      <Ablauf />
      <Wirkung />
      <Pilot />
      <Faq />
      <CtaBand />
    </>
  );
}
