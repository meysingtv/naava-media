"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

import { cn } from "@/lib/utils";

const groessen = {
  xs: "h-5 w-5 text-[10px]",
  sm: "h-6 w-6 text-2xs",
  md: "h-7 w-7 text-2xs",
  lg: "h-9 w-9 text-xs",
  xl: "h-12 w-12 text-sm",
} as const;

/** Avatar v3: neutraler Fallback – Farbe trägt nur der `SchuelerAvatar`. */
const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> & { size?: keyof typeof groessen }
>(({ className, size = "md", ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn("relative flex shrink-0 overflow-hidden rounded-full", groessen[size], className)}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full object-cover", className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-surface-muted font-semibold text-foreground-secondary",
      className,
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback };
