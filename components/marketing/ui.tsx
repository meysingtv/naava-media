import Link from "next/link";
import { Check as CheckIcon } from "lucide-react";

export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Container({ className, children, wide }: { className?: string; children: React.ReactNode; wide?: boolean }) {
  return <div className={cn("mx-auto w-full px-5 sm:px-8", wide ? "max-w-[1440px]" : "max-w-wrap", className)}>{children}</div>;
}

/** Kleine Rubrik über einer Überschrift – Versalien, kräftig, mit orangem Punkt. */
export function Eyebrow({ children, className, light }: { children: React.ReactNode; className?: string; light?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-[12.5px] font-extrabold uppercase tracking-[0.14em]",
        light ? "text-brand-accent" : "text-brand",
        className,
      )}
    >
      <span className="h-2 w-2 rounded-full bg-orange" aria-hidden />
      {children}
    </span>
  );
}

export function Arrow({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 12" width="16" height="12" fill="none" className={className} aria-hidden>
      <path d="M0 6h14M9.5 1.5 14 6l-4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type BtnProps = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "brand" | "ghost" | "outline" | "light" | "dark";
  size?: "md" | "lg";
  className?: string;
  arrow?: boolean;
};

/** Pillen-Buttons. primary = Orange (Conversion), brand = Grün, outline = weiß auf Farbe. */
export function Btn({ href, children, variant = "primary", size = "md", className, arrow }: BtnProps) {
  const base =
    "group inline-flex items-center justify-center gap-2 rounded-full font-bold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none";
  const sizes = size === "lg" ? "h-14 px-8 text-[16px]" : "h-12 px-6 text-[15px]";
  const variants = {
    primary: "bg-orange text-white shadow-cta hover:bg-orange-dark",
    brand: "bg-brand text-white hover:bg-brand-dark",
    ghost: "border-2 border-ink/15 bg-white text-ink hover:border-ink",
    outline: "border-2 border-white/70 bg-transparent text-white hover:bg-white hover:text-brand-dark",
    light: "bg-white text-brand-dark hover:bg-brand-light",
    dark: "bg-ink text-white hover:bg-black",
  }[variant];
  return (
    <Link href={href} className={cn(base, sizes, variants, className)}>
      {children}
      {arrow && <Arrow className="transition-transform duration-200 group-hover:translate-x-1" />}
    </Link>
  );
}

export function TextLink({ href, children, className, light }: { href: string; children: React.ReactNode; className?: string; light?: boolean }) {
  return (
    <Link
      href={href}
      className={cn("group inline-flex items-center gap-2 text-[15px] font-bold transition-colors", light ? "text-white hover:text-brand-accent" : "text-brand hover:text-brand-dark", className)}
    >
      {children}
      <Arrow className="transition-transform duration-200 group-hover:translate-x-1" />
    </Link>
  );
}

/** Häkchen-Aufzählung – das Arbeitspferd dieser Branche. */
export function Check({ children, light, className }: { children: React.ReactNode; light?: boolean; className?: string }) {
  return (
    <li className={cn("flex items-start gap-3 text-[15.5px] leading-snug", light ? "text-white/90" : "text-ink/85", className)}>
      <span className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full", light ? "bg-brand-accent text-dark" : "bg-brand text-white")}>
        <CheckIcon className="h-3 w-3" strokeWidth={3.5} />
      </span>
      <span>{children}</span>
    </li>
  );
}
