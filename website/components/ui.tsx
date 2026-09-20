import Link from "next/link";

export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Container({ className, children, wide }: { className?: string; children: React.ReactNode; wide?: boolean }) {
  return <div className={cn("mx-auto w-full px-5 sm:px-8 lg:px-12", wide ? "max-w-[1560px]" : "max-w-wrap", className)}>{children}</div>;
}

/** Kleine Meta-Zeile in Mono – wie eine Rubrik im Magazin. */
export function Eyebrow({ children, className, num }: { children: React.ReactNode; className?: string; num?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-3 font-mono text-[12px] uppercase tracking-[0.16em] text-mint", className)}>
      {num ? (
        <span className="tnum text-pylon">{num}</span>
      ) : (
        <span className="inline-block h-[7px] w-[7px] bg-pylon" aria-hidden />
      )}
      {children}
    </span>
  );
}

/** Schlanker Pfeil (statt Icon-Bibliothek) – wirkt gesetzt, nicht generiert. */
export function Arrow({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 12" width="16" height="12" fill="none" className={className} aria-hidden>
      <path d="M0 6h14M9.5 1.5 14 6l-4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type BtnProps = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "ghost" | "light" | "dark" | "mint";
  size?: "md" | "lg";
  className?: string;
  arrow?: boolean;
};

export function Btn({ href, children, variant = "primary", size = "md", className, arrow }: BtnProps) {
  const base =
    "group inline-flex items-center justify-center gap-2.5 rounded-md font-medium tracking-[-0.005em] transition-all duration-200 active:translate-y-px focus-visible:outline-none";
  const sizes = size === "lg" ? "h-[52px] px-7 text-[15.5px]" : "h-12 px-6 text-[15px]";
  const variants = {
    primary: "bg-ink text-cream hover:bg-mint-deep",
    mint: "bg-mint text-white hover:bg-mint-dark",
    ghost: "border border-ink/25 bg-transparent text-ink hover:border-ink hover:bg-ink hover:text-cream",
    light: "bg-cream text-ink hover:bg-white",
    dark: "bg-ink text-cream hover:bg-black",
  }[variant];
  return (
    <Link href={href} className={cn(base, sizes, variants, className)}>
      {children}
      {arrow && <Arrow className="transition-transform duration-200 group-hover:translate-x-1" />}
    </Link>
  );
}

/** Unterstrichener Textlink mit Pfeil – editorial statt Button-Wüste. */
export function TextLink({ href, children, className, light }: { href: string; children: React.ReactNode; className?: string; light?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-2 text-[15px] font-medium underline decoration-1 underline-offset-[6px] transition-colors",
        light ? "text-cream decoration-cream/40 hover:decoration-cream" : "text-ink decoration-ink/30 hover:decoration-ink",
        className,
      )}
    >
      {children}
      <Arrow className="transition-transform duration-200 group-hover:translate-x-1" />
    </Link>
  );
}
