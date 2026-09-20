import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Icon 16 px links im Feld (z. B. Search in Filterleisten). */
  leadingIcon?: LucideIcon;
  /** Einheit oder Aktion rechts im Feld („€", „Min"). */
  trailing?: React.ReactNode;
  /** `sm` = 32 px für Filterleisten, sonst 38 px. */
  inputSize?: "sm" | "default";
}

/** Eingabefeld v3: 38 px, 8-px-Radius, Rahmen bleibt Rahmen (kein Ring-Wechsel). */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, leadingIcon: Leading, trailing, inputSize = "default", ...props }, ref) => {
    const feld = (
      <input
        type={type}
        className={cn(
          "flex w-full rounded-md border border-input bg-card text-13 text-foreground transition-[border-color,box-shadow] duration-fast ease-soft",
          inputSize === "sm" ? "h-8 px-2.5" : "h-9.5 px-3",
          "file:border-0 file:bg-transparent file:text-13 file:font-medium placeholder:text-foreground-disabled",
          "hover:border-border-hover",
          "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20",
          "aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-[3px] aria-[invalid=true]:ring-destructive/15",
          "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-foreground-disabled",
          Leading && "pl-9",
          trailing && "pr-9",
          className,
        )}
        ref={ref}
        {...props}
      />
    );

    if (!Leading && !trailing) return feld;

    return (
      <div className="relative w-full">
        {Leading && (
          <Leading
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-tertiary"
            strokeWidth={1.75}
            aria-hidden="true"
          />
        )}
        {feld}
        {trailing && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-foreground-tertiary">
            {trailing}
          </span>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
