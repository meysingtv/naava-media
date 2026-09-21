import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Buttons v3: 36 px hoch, 8-px-Radius, Icons 15 px. Markengrün nur für die
 * eine Primäraktion je Sichtbereich; `secondary` ist ein neutraler Grau-Button
 * (nicht mehr Tinte). Dunkle Flächen gehören in v3 allein der Sidebar.
 */
const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-13 font-medium leading-none transition-colors duration-fast ease-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-[15px] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed",
        soft: "bg-primary-soft text-primary-text hover:bg-primary-soft-strong/60 active:bg-primary-soft-strong",
        outline:
          "border border-border-strong bg-card text-foreground shadow-xs hover:border-border-hover hover:bg-surface-muted active:bg-border",
        secondary: "bg-secondary text-foreground hover:bg-border active:bg-border-strong/60",
        ghost: "text-foreground-secondary hover:bg-foreground/[0.05] hover:text-foreground",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive-text",
        "danger-soft": "bg-destructive-soft text-destructive-text hover:bg-destructive/15",
        success: "bg-success text-success-foreground hover:bg-success-text",
        link: "h-auto px-0 text-primary-text underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-3.5", // 36
        lg: "h-9.5 px-4", // 38 – Formular-Primär, Speichern-Leiste, Auth
        sm: "h-8 px-2.5", // 32 – Toolbars, Panel-Köpfe, Tabellen
        xs: "h-7 px-2 text-xs", // 28 – inline in Zellen
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8",
        "icon-xs": "h-7 w-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Zeigt einen Spinner links, setzt `aria-busy` und deaktiviert den Button. */
  loading?: boolean;
  /** Tastenkürzel rechts im Button – erst ab `md` sichtbar. */
  shortcut?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, shortcut, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    // Bei `asChild` reicht Radix nur ein einziges Kind durch – Spinner und
    // Kürzel bleiben dort außen vor, damit der Aufruf gültig bleibt.
    if (asChild) {
      return (
        <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
          {children}
        </Comp>
      );
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        aria-busy={loading || undefined}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
        {children}
        {shortcut && <kbd className="kbd ml-1.5 hidden md:inline-flex">{shortcut}</kbd>}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
