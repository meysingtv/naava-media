import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Status v2: Punkt + neutraler Text statt gefüllter Pille. Die Variante
 * färbt nur den Punkt. Über `[&_i]:bg-…` in className lässt sich der
 * Punkt gezielt umfärben (z. B. aus lib/constants).
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm text-xs font-medium leading-4 text-foreground-secondary [&_i]:h-1.5 [&_i]:w-1.5 [&_i]:shrink-0 [&_i]:rounded-full",
  {
    variants: {
      variant: {
        default: "[&_i]:bg-primary",
        solid: "rounded-sm bg-foreground px-1.5 py-0.5 text-background [&_i]:hidden",
        secondary: "[&_i]:bg-border-strong",
        success: "[&_i]:bg-success",
        warning: "[&_i]:bg-warning",
        destructive: "[&_i]:bg-destructive",
        outline: "[&_i]:bg-border-strong",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      <i aria-hidden="true" />
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
