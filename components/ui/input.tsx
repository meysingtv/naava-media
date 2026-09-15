import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-8 w-full rounded-md border border-border-strong bg-card px-2.5 text-[13px] text-foreground transition-[border-color,box-shadow] duration-fast ease-soft",
          "file:border-0 file:bg-transparent file:text-[13px] file:font-medium placeholder:text-foreground-disabled",
          "hover:border-[hsl(198_12%_70%)]",
          "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
          "aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-destructive/20",
          "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-foreground-disabled",
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
