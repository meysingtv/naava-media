import { Btn, Container, Eyebrow } from "@/components/ui";

/** Grüner Kopf für Unterseiten. */
export function PageHero({
  eyebrow,
  title,
  sub,
  cta,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  sub?: React.ReactNode;
  cta?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-brand text-white">
      <div className="pointer-events-none absolute -right-40 -top-48 h-[560px] w-[560px] rounded-full bg-brand-accent/35 blur-3xl" aria-hidden />
      <Container className="relative grid items-center gap-10 py-16 md:grid-cols-[1.1fr_.9fr] md:py-24">
        <div>
          <Eyebrow light>{eyebrow}</Eyebrow>
          <h1 className="mt-4 text-[clamp(36px,5.2vw,64px)] font-extrabold leading-[1.02] tracking-[-0.03em] text-balance">{title}</h1>
          {sub && <p className="mt-5 max-w-[50ch] text-[18px] leading-relaxed text-white/85">{sub}</p>}
          {cta && (
            <div className="mt-8 flex flex-wrap gap-3">
              <Btn href="/demo" size="lg" arrow>
                Demo anfordern
              </Btn>
              <Btn href="/kontakt" variant="outline" size="lg">
                Kontakt
              </Btn>
            </div>
          )}
        </div>
        {children && <div className="relative">{children}</div>}
      </Container>
    </section>
  );
}
