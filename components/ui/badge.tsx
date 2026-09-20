import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Status v3: Pille mit Punkt. Jede Variante bringt Soft-Fläche und die
 * lesbare `*-text`-Stufe mit – Text hängt nie an der Markenfarbe selbst.
 * Der `[&_i]`-Mechanismus bleibt, damit Klassen aus lib/constants weiterhin
 * nur den Punkt umfärben.
 */
const badgeVariants = cva(
  "inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-xs font-medium leading-none [&_i]:h-1.5 [&_i]:w-1.5 [&_i]:shrink-0 [&_i]:rounded-full",
  {
    variants: {
      variant: {
        default: "bg-primary-soft text-primary-text [&_i]:bg-primary",
        success: "bg-success-soft text-success-text [&_i]:bg-success",
        warning: "bg-warning-soft text-warning-text [&_i]:bg-warning",
        destructive: "bg-destructive-soft text-destructive-text [&_i]:bg-destructive",
        info: "bg-info-soft text-info-text [&_i]:bg-info",
        secondary: "bg-surface-muted text-foreground-secondary [&_i]:bg-foreground-tertiary",
        outline:
          "bg-card text-foreground-secondary shadow-[0_0_0_1px_hsl(var(--border-strong))] [&_i]:bg-foreground-tertiary",
        solid: "bg-foreground text-background [&_i]:hidden",
        // sehr dichte Tabellen: nur Punkt + Text, ohne Fläche
        neutral: "bg-transparent px-0 text-foreground-secondary [&_i]:bg-foreground-tertiary",
      },
      size: {
        default: "",
        sm: "h-[18px] px-1.5 text-2xs",
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
  /** Punkt links ausblenden (Default: sichtbar). */
  dot?: boolean;
}

function Badge({ className, variant, size, dot = true, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && <i aria-hidden="true" />}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
