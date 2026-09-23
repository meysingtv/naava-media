import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Etikett v4: kleines, eckiges Schild (4-px-Radius, 20 px hoch) mit heller
 * Fläche und dunkler Schrift derselben Farbfamilie – kein Rahmen, kein
 * Kreis, standardmäßig kein Punkt. Für dichte Tabellen gibt es
 * `StatusDot` (nur Punkt + Text).
 *
 * Der `[&_i]`-Mechanismus bleibt, damit Klassen aus lib/constants den
 * Punkt umfärben, wenn ein Aufrufer ihn mit `dot` einschaltet.
 */
const badgeVariants = cva(
  "inline-flex h-5 items-center gap-1.5 whitespace-nowrap rounded-sm px-1.5 text-xs font-medium leading-none [&_i]:h-1.5 [&_i]:w-1.5 [&_i]:shrink-0 [&_i]:rounded-full",
  {
    variants: {
      variant: {
        default: "bg-primary-soft text-primary-text [&_i]:bg-primary",
        success: "bg-success-soft text-success-text [&_i]:bg-success",
        warning: "bg-warning-soft text-warning-text [&_i]:bg-warning",
        destructive: "bg-destructive-soft text-destructive-text [&_i]:bg-destructive",
        info: "bg-info-soft text-info-text [&_i]:bg-info",
        secondary: "bg-muted text-foreground-secondary [&_i]:bg-foreground-tertiary",
        outline:
          "bg-card text-foreground-secondary shadow-[inset_0_0_0_1px_hsl(var(--border-strong))] [&_i]:bg-foreground-tertiary",
        solid: "bg-foreground text-background [&_i]:hidden",
        // dichte Tabellen: nur Text (+ Punkt, wenn eingeschaltet), ohne Fläche
        neutral: "bg-transparent px-0 text-foreground-secondary [&_i]:bg-foreground-tertiary",
      },
      size: {
        default: "",
        sm: "h-[18px] px-1 text-2xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Punkt links einblenden (Default: aus). */
  dot?: boolean;
}

function Badge({ className, variant, size, dot = false, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && <i aria-hidden="true" />}
      {children}
    </span>
  );
}

const punktFarbe = {
  neutral: "bg-foreground-tertiary",
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  info: "bg-info",
} as const;

/**
 * Status in Tabellen und Listen: 6-px-Punkt + Text in normaler Textfarbe.
 * Die Farbe steckt nur im Punkt – so bleibt eine Liste ruhig.
 */
function StatusDot({
  ton = "neutral",
  children,
  className,
}: {
  ton?: keyof typeof punktFarbe;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 whitespace-nowrap text-13 text-foreground", className)}>
      <i aria-hidden="true" className={cn("h-1.5 w-1.5 shrink-0 rounded-full", punktFarbe[ton])} />
      {children}
    </span>
  );
}

export { Badge, StatusDot, badgeVariants };
