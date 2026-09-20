import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Panel-Fläche v3: weiß auf der warmen Arbeitsfläche, 10-px-Radius,
 * weicher Schatten mit 1-px-Ring – KEINE Haarlinie mehr. `border` und
 * `divide-y` bleiben nur noch INNERHALB von Panels erlaubt.
 */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "dense" | "default";
  interactive?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, padding, interactive, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl bg-card text-card-foreground shadow-panel print:shadow-none print:ring-1 print:ring-border",
        padding === "none" && "p-0",
        padding === "dense" && "p-3",
        padding === "default" && "p-4",
        interactive &&
          "transition-shadow duration-fast ease-soft hover:shadow-md focus-within:shadow-md",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

/**
 * Kopf v3: Titel links, Aktion rechts. Aktionen werden mit `data-card-action`
 * markiert; ohne Markierung bleibt das bisherige Stapelverhalten erhalten,
 * damit bestehende Aufrufe mit Titel UND Beschreibung nicht nebeneinander
 * landen.
 */
const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const kinder = React.Children.toArray(children);
    const letztes = kinder[kinder.length - 1];
    const hatAktion =
      kinder.length > 1 &&
      React.isValidElement(letztes) &&
      (letztes.props as Record<string, unknown>)["data-card-action"] !== undefined;

    if (hatAktion) {
      return (
        <div
          ref={ref}
          className={cn("flex items-start justify-between gap-3 px-4 pb-2 pt-3.5", className)}
          {...props}
        >
          <div className="min-w-0 space-y-0.5">{kinder.slice(0, -1)}</div>
          {letztes}
        </div>
      );
    }

    return (
      <div ref={ref} className={cn("flex flex-col gap-0.5 px-4 pb-2 pt-3.5", className)} {...props}>
        {children}
      </div>
    );
  },
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-sm font-semibold leading-5 text-foreground", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-xs text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("px-4 pb-4 pt-0", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center gap-2 border-t border-border px-4 py-3", className)}
      {...props}
    />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
