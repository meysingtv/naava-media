import Image from "next/image";
import { Check } from "lucide-react";

import { Btn, Container, Eyebrow, cn } from "@/components/ui";

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
    <div className={cn(center ? "mx-auto max-w-2xl text-center" : "max-w-2xl", className)}>
      {eyebrow && <Eyebrow className={center ? "justify-center" : ""}>{eyebrow}</Eyebrow>}
      <h2 className="mt-4 font-display text-[clamp(28px,4vw,44px)] font-bold leading-[1.05] tracking-tight text-ink text-balance">{title}</h2>
      {sub && <p className="mt-4 text-[18px] leading-relaxed text-muted">{sub}</p>}
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
    <div id={id} className="grid items-center gap-12 border-t border-line py-16 md:grid-cols-2 md:gap-16 md:py-24">
      <div data-reveal className={cn(reverse && "md:order-2")}>
        <span className="text-[13px] font-bold uppercase tracking-[0.12em] text-mint">{kick}</span>
        <h3 className="mt-3 font-display text-[clamp(24px,3vw,34px)] font-bold leading-[1.08] tracking-tight text-ink text-balance">{title}</h3>
        <p className="mt-4 max-w-[46ch] text-[16.5px] leading-relaxed text-muted">{text}</p>
        <ul className="mt-6 grid gap-2.5">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-2.5 text-[15.5px]">
              <span className="mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-md bg-mint-soft text-mint">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
              {p}
            </li>
          ))}
        </ul>
        {cta && (
          <div className="mt-7">
            <Btn href={cta.href} variant="ghost" arrow>
              {cta.label}
            </Btn>
          </div>
        )}
      </div>
      <div data-reveal data-delay="80ms" className={cn("relative", reverse && "md:order-1")}>
        <div
          aria-hidden
          className={cn(
            "absolute -inset-5 -z-10 rounded-[32px] md:-inset-8",
            reverse ? "bg-gradient-to-bl from-mint-soft via-white to-mint-hi/40" : "bg-gradient-to-br from-mint-hi/45 via-white to-mint-soft",
          )}
        />
        <div className="rounded-[22px] shadow-[0_40px_80px_-40px_rgba(15,45,30,.4)]">{children}</div>
      </div>
    </div>
  );
}

export function CtaBand({ compact }: { compact?: boolean }) {
  return (
    <section className={cn(compact ? "py-14" : "py-20")}>
      <Container>
        <div className="relative overflow-hidden rounded-[28px] bg-mint-dark px-8 py-14 text-center text-white md:px-16 md:py-20">
          <Image src="/images/lektion-pov.jpg" alt="" aria-hidden fill sizes="(max-width: 1200px) 100vw, 1152px" className="object-cover object-center" />
          <div className="pointer-events-none absolute inset-0 bg-mint-dark/68" aria-hidden />
          <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(75% 96% at 50% 52%, rgba(6,34,21,.6), transparent 78%)" }} aria-hidden />
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{ backgroundImage: "radial-gradient(60% 80% at 85% -10%, rgba(157,241,200,.5), transparent 70%)" }}
            aria-hidden
          />
          <div className="relative">
            <h2 className="mx-auto max-w-3xl font-display text-[clamp(26px,3.6vw,40px)] font-bold leading-[1.08] text-balance">
              Schau dir an, wie deine Fahrschule damit laufen könnte.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[18px] text-white/85">
              Wir zeigen dir FahrschulApp anhand deines Arbeitsalltags – von der ersten Fahrstunde bis zur Rechnung.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Btn href="/demo" variant="light" size="lg" arrow>
                Demo anfordern
              </Btn>
              <Btn href="/funktionen" variant="dark" size="lg" className="!bg-white/10 !text-white hover:!bg-white/20">
                Funktionen ansehen
              </Btn>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
