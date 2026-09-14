"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

/** Underline-Tabs: ruhige Textreiter mit 2-px-Türkis-Indikator. */
const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-end gap-1 border-b border-border text-muted-foreground",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "relative -mb-px inline-flex h-10 items-center justify-center whitespace-nowrap px-3 text-sm font-medium text-muted-foreground transition-colors duration-fast ease-soft",
      "after:absolute after:inset-x-1 after:bottom-0 after:h-0.5 after:rounded-full after:bg-transparent after:transition-colors after:duration-fast",
      "hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25 focus-visible:rounded-md",
      "disabled:pointer-events-none disabled:opacity-50",
      "data-[state=active]:text-foreground data-[state=active]:after:bg-primary",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-4 animate-fade-in focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25 focus-visible:rounded-md",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
