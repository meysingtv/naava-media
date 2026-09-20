import Image from "next/image";

import { Btn, Container, Eyebrow, TextLink, cn } from "@/components/ui";

export function SectionHead({
  eyebrow,
  title,
  sub,
  center,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  sub?: React.ReactNode;
  center?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(center ? "mx-auto max-w-3xl text-center" : "max-w-3xl", className)}>
      {eyebrow && <Eyebrow className={center ? "justify-center" : ""}>{eyebrow}</Eyebrow>}
      <h2 className="mt-5 font-display text-[clamp(32px,4.2vw,56px)] font-normal leading-[1.04] tracking-[-0.02em] text-ink text-balance">{title}</h2>
      {sub && <p className="mt-5 text-[17.5px] leading-[1.6] text-ink/70">{sub}</p>}
    </div>
  );
}

export function FeatureRow({
  kick,
  title,
  text,
  points,
  reverse,
  children,
  id,
  cta,
}: {
  kick: string;
  title: React.ReactNode;
  text: React.ReactNode;
  points: string[];
  reverse?: boolean;
  children: React.ReactNode;
  id?: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div id={id} className="grid items-center gap-10 border-t border-line py-14 md:grid-cols-12 md:gap-10 md:py-20">
      <div data-reveal className={cn("md:col-span-4 md:row-start-1", reverse ? "md:col-start-9" : "md:col-start-1")}>
        <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-pylon">{kick}</span>
        <h3 className="mt-3 font-display text-[clamp(26px,2.8vw,38px)] leading-[1.08] tracking-[-0.015em] text-ink text-balance">{title}</h3>
        <p className="mt-5 text-[16.5px] leading-[1.6] text-ink/70">{text}</p>
        <ul className="mt-6 border-t border-line">
          {points.map((p) => (
            <li key={p} className="flex gap-3 border-b border-line py-2.5 text-[15px] text-ink/85">
              <span className="text-mint" aria-hidden>
                —
              </span>
              {p}
            </li>
          ))}
        </ul>
        {cta && (
          <div className="mt-7">
            <TextLink href={cta.href}>{cta.label}</TextLink>
          </div>
        )}
      </div>
      <div data-reveal data-delay="80ms" className={cn("md:col-span-8 md:row-start-1", reverse ? "md:col-start-1" : "md:col-start-5")}>
        <div className="grain rounded-sm bg-sand p-4 sm:p-8 lg:p-12">
          <div className="relative z-[2]">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function CtaBand({ compact }: { compact?: boolean }) {
  return (
    <section className={cn("relative overflow-hidden bg-mint-deep text-cream", compact ? "py-20 md:py-24" : "py-24 md:py-36")}>
      <Image src="/images/fahrt.jpg" alt="" aria-hidden fill sizes="100vw" className="object-cover" />
      <div className="pointer-events-none absolute inset-0 bg-mint-deep/80" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-mint-deep via-transparent to-mint-deep/50" aria-hidden />
      <Container wide className="relative z-[2] grid gap-10 md:grid-cols-12 md:items-end md:gap-8">
        <div className="md:col-span-8">
          <Eyebrow className="!text-mint-hi">Demo</Eyebrow>
          <h2 className="mt-5 font-display text-[clamp(36px,5.2vw,76px)] leading-[0.98] tracking-[-0.02em] text-balance">
            Schau dir an, wie deine Fahrschule damit laufen könnte.
          </h2>
        </div>
        <div className="md:col-span-4 md:pb-2">
          <p className="text-[17px] leading-[1.6] text-cream/80">
            Wir zeigen dir FahrschulApp anhand deines Alltags – von der ersten Fahrstunde bis zur Rechnung. Persönlich, ohne Verkaufsshow.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-4">
            <Btn href="/demo" variant="light" size="lg" arrow>
              Demo anfordern
            </Btn>
            <TextLink light href="/kontakt">
              Oder schreib uns
            </TextLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
