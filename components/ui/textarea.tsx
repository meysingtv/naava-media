import * as React from "react";

import { cn } from "@/lib/utils";

/** Textfeld v3: gleiche Optik wie Input, Mindesthöhe 96 px, vertikal skalierbar. */
const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[96px] w-full resize-y rounded-md border border-input bg-card px-3 py-2.5 text-13 leading-5 text-foreground transition-[border-color,box-shadow] duration-fast ease-soft",
        "placeholder:text-foreground-disabled hover:border-border-hover",
        "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20",
        "aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-[3px] aria-[invalid=true]:ring-destructive/15",
        "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-foreground-disabled",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
