import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-border-strong bg-background px-3 py-2 text-sm text-foreground shadow-xs transition-[border-color,box-shadow] duration-fast ease-soft",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-foreground-disabled",
          "hover:border-[hsl(205_18%_74%)]",
          "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20",
          "aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-[3px] aria-[invalid=true]:ring-destructive/15",
          "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-foreground-disabled disabled:shadow-none",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
