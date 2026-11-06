"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

// Variante an die Trigger durchreichen, damit „pills" ohne zweite Prop je
// Trigger funktioniert.
const TabsVarianteContext = React.createContext<"underline" | "pills">("underline");

/**
 * Reiter v4: Unterstrich-Reiter für Inhaltsebenen (aktiv = dunkle Schrift +
 * dunkler 2-px-Strich), `pills` als helle Segment-Steuerung (Tag/Woche,
 * Zeiträume). Blau kommt in Reitern nicht vor.
 */
const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & { variant?: "underline" | "pills" }
>(({ className, variant = "underline", ...props }, ref) => (
  <TabsVarianteContext.Provider value={variant}>
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        variant === "pills"
          ? "inline-flex h-8 w-auto items-center gap-0.5 rounded-md border-0 bg-muted p-0.5"
          : "flex h-10 w-full items-end gap-6 overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      {...props}
    />
  </TabsVarianteContext.Provider>
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & { count?: number }
>(({ className, count, children, ...props }, ref) => {
  const variant = React.useContext(TabsVarianteContext);
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "group relative inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap font-medium transition-colors duration-fast",
        "focus-visible:text-foreground focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        variant === "pills"
          ? "h-7 rounded-[5px] px-2.5 text-13 text-muted-foreground hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-[0_1px_2px_rgba(16,24,40,0.08),0_0_0_1px_hsl(var(--border))]"
          : cn(
              "-mb-px h-10 px-0.5 text-sm text-muted-foreground hover:text-foreground",
              "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-transparent after:transition-colors",
              "data-[state=active]:text-foreground data-[state=active]:after:bg-foreground",
            ),
        className,
      )}
      {...props}
    >
      {children}
      {count != null && (
        <span className="rounded-sm bg-muted px-1.5 text-2xs font-medium tabular-nums text-foreground-secondary group-data-[state=active]:text-foreground">
          {count}
        </span>
      )}
    </TabsPrimitive.Trigger>
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("mt-5 animate-fade-in focus-visible:outline-none", className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
