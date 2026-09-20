import Image from "next/image";

import { Btn, Check, Container, Eyebrow, TextLink, cn } from "@/components/ui";

export function SectionHead({
  eyebrow,
  title,
  sub,
  center,
  light,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  sub?: React.ReactNode;
  center?: boolean;
  light?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(center ? "mx-auto max-w-3xl text-center" : "max-w-3xl", className)}>
      {eyebrow && (
        <Eyebrow light={light} className={center ? "justify-center" : ""}>
          {eyebrow}
        </Eyebrow>
      )}
      <h2 className={cn("mt-4 text-[clamp(30px,4.2vw,50px)] font-extrabold leading-[1.05] tracking-[-0.025em] text-balance", light ? "text-white" : "text-ink")}>
        {title}
      </h2>
      {sub && <p className={cn("mt-5 text-[17.5px] leading-relaxed", light ? "text-white/75" : "text-muted")}>{sub}</p>}
    </div>
  );
}

/** Feature-Zeile: Text links, Screenshot rechts (oder umgekehrt) auf hellem Panel. */
export function FeatureRow({
  kick,
  title,
  text,
  points,
  reverse,
  children,
  id,
  cta,
  tone = "paper",
}: {
  kick: string;
  title: React.ReactNode;
  text: React.ReactNode;
  points: string[];
  reverse?: boolean;
  children: React.ReactNode;
  id?: string;
  cta?: { href: string; label: string };
  tone?: "paper" | "brand" | "orange" | "purple" | "sky" | "yellow";
}) {
  const panel = {
    paper: "bg-paper",
    brand: "bg-brand-light",
    orange: "bg-orange-light",
    purple: "bg-[#EFE9FC]",
    sky: "bg-[#E8F1FD]",
    yellow: "bg-[#FFF6DD]",
  }[tone];
  const blob = {
    paper: "bg-brand/15",
    brand: "bg-brand/25",
    orange: "bg-orange/25",
    purple: "bg-purple/20",
    sky: "bg-sky/20",
    yellow: "bg-yellow/40",
  }[tone];
  return (
    <div id={id} className="grid items-center gap-10 py-12 md:grid-cols-2 md:gap-16 md:py-16">
      <div data-reveal className={cn(reverse && "md:order-2")}>
        <Eyebrow>{kick}</Eyebrow>
        <h3 className="mt-4 text-[clamp(26px,3.2vw,38px)] font-extrabold leading-[1.08] tracking-[-0.02em] text-ink text-balance">{title}</h3>
        <p className="mt-4 max-w-[50ch] text-[16.5px] leading-relaxed text-muted">{text}</p>
        <ul className="mt-6 grid gap-3">
          {points.map((p) => (
            <Check key={p}>{p}</Check>
          ))}
        </ul>
        {cta && (
          <div className="mt-7">
            <TextLink href={cta.href}>{cta.label}</TextLink>
          </div>
        )}
      </div>
      <div data-reveal data-delay="80ms" className={cn("relative", reverse && "md:order-1")}>
        <div className={cn("relative overflow-hidden rounded-[28px] p-5 sm:p-8 md:p-10", panel)}>
          <span className={cn("pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full blur-2xl", blob)} aria-hidden />
          <div className="relative">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function CtaBand({ compact }: { compact?: boolean }) {
  return (
    <section className={cn("relative overflow-hidden bg-brand-deep text-white", compact ? "py-20" : "py-24 md:py-32")}>
      <Image src="/images/fahrt.jpg" alt="" aria-hidden fill sizes="100vw" className="object-cover opacity-30" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-brand-deep via-brand-deep/90 to-brand-dark/70" aria-hidden />
      <Container className="relative grid items-center gap-10 md:grid-cols-[1.2fr_1fr]">
        <div>
          <Eyebrow light>Persönliche Demo</Eyebrow>
          <h2 className="mt-4 text-[clamp(32px,4.8vw,58px)] font-extrabold leading-[1.02] tracking-[-0.025em] text-balance">
            Bereit für weniger Büro und mehr Fahrstunden?
          </h2>
          <p className="mt-5 max-w-[48ch] text-[17.5px] leading-relaxed text-white/80">
            Wir zeigen dir FahrschulApp anhand deines Alltags – von der ersten Fahrstunde bis zur Rechnung. Kostenlos, unverbindlich, ohne
            Verkaufsshow.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Btn href="/demo" size="lg" arrow>
              Demo anfordern
            </Btn>
            <Btn href="/kontakt" variant="outline" size="lg">
              Oder schreib uns
            </Btn>
          </div>
        </div>
        <ul className="grid gap-3 rounded-3xl bg-white/10 p-6 backdrop-blur md:p-8">
          <Check light>Demo in 30 Minuten – online oder bei dir</Check>
          <Check light>Einrichtung und Datenübernahme inklusive</Check>
          <Check light>Direkter Draht zum Gründer, kein Ticket-System</Check>
          <Check light>DSGVO-konform, Server in Deutschland</Check>
        </ul>
      </Container>
    </section>
  );
}
