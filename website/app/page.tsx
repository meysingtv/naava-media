import { CtaBand } from "@/components/bits";
import { Hero, Inhalt, Ticker } from "@/components/home/hero";
import { Alltag, Dossier, Produkt } from "@/components/home/chapters";
import { Ablauf, Bildstrecke, Wirkung } from "@/components/home/spreads";
import { Faq, Stimmen, Vertrauen } from "@/components/home/closing";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Ticker />
      <Inhalt />
      <Alltag />
      <Produkt />
      <Dossier />
      <Bildstrecke />
      <Ablauf />
      <Vertrauen />
      <Wirkung />
      <Stimmen />
      <Faq />
      <CtaBand />
    </>
  );
}
