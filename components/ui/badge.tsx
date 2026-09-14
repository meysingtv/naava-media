import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Weich getönte Status-Pills: Soft-Hintergrund + dunkler Ton derselben Farbe.
 * `solid` ist die einzige gefüllte Variante (z. B. „Heute").
 */
const badgeVariants = cva(
  "inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full border px-2 text-xs font-medium leading-none transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary-soft text-primary-pressed",
        solid: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-surface-muted text-foreground-secondary",
        success: "border-transparent bg-success-soft text-success",
        warning: "border-transparent bg-warning-soft text-warning",
        destructive: "border-transparent bg-destructive-soft text-destructive",
        outline: "border-border-strong bg-background text-foreground-secondary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
