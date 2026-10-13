"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

/** Kontrollkästchen v3: 16 px, 6-px-Radius, `indeterminate` für „alle auswählen". */
const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-4 w-4 shrink-0 rounded-sm border border-border-strong bg-card shadow-xs transition-colors duration-fast ease-soft",
      "hover:border-border-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-white",
      "data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-white",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
      {props.checked === "indeterminate" ? (
        <Minus className="h-3 w-3" strokeWidth={3} />
      ) : (
        <Check className="h-3 w-3" strokeWidth={3} />
      )}
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
