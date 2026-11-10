"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "@/lib/utils";

/**
 * Feld-Label v4: 13/500 in Textfarbe, steht immer ÜBER dem Feld. Den Abstand
 * setzt `Field` (mb-1.5) – hier bleibt er aus, damit bestehende Wrapper mit
 * eigenem `gap` nicht doppelt Luft bekommen.
 */
const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & {
    /** Hängt einen roten Stern an das Label. */
    required?: boolean;
    /** Hinweis rechts neben dem Label (z. B. „optional"). */
    hint?: string;
  }
>(({ className, required, hint, children, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      "block text-13 font-medium leading-5 text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-60",
      hint && "flex items-center justify-between gap-2",
      className,
    )}
    {...props}
  >
    <span>
      {children}
      {required && <span className="ml-0.5 text-destructive-text">*</span>}
    </span>
    {hint && <span className="font-normal text-foreground-tertiary">{hint}</span>}
  </LabelPrimitive.Root>
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
