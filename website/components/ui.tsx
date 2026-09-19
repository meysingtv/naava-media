import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-wrap px-6 md:px-8", className)}>{children}</div>;
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] text-mint", className)}>
      <span className="h-[1.5px] w-6 bg-mint/60" aria-hidden />
      {children}
    </span>
  );
}

type BtnProps = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "ghost" | "light" | "dark";
  size?: "md" | "lg";
  className?: string;
  arrow?: boolean;
};

export function Btn({ href, children, variant = "primary", size = "md", className, arrow }: BtnProps) {
  const base =
    "group inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 active:translate-y-px focus-visible:outline-none";
  const sizes = size === "lg" ? "h-12 px-6 text-[15.5px]" : "h-11 px-5 text-[15px]";
  const variants = {
    primary: "bg-mint text-white shadow-[0_10px_24px_-10px_rgba(26,127,78,.55)] hover:bg-mint-dark hover:shadow-[0_14px_30px_-12px_rgba(26,127,78,.6)]",
    ghost: "border border-line2 bg-white text-ink hover:bg-paper",
    light: "bg-white text-mint-dark hover:bg-mint-soft",
    dark: "bg-ink text-white hover:bg-black",
  }[variant];
  return (
    <Link href={href} className={cn(base, sizes, variants, className)}>
      {children}
      {arrow && <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />}
    </Link>
  );
}
