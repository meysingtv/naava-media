import { CtaBand } from "@/components/marketing/bits";
import { Hero, LogoStrip, PhotoBanner, TrustTiles } from "@/components/marketing/home/hero";
import { Modules } from "@/components/marketing/home/modules";
import { FeatureRows } from "@/components/marketing/home/rows";
import { Highlights } from "@/components/marketing/home/highlights";
import { Ablauf, Pilot, Wirkung } from "@/components/marketing/home/ablauf";
import { Faq } from "@/components/marketing/home/faq";

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
