"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-dialog bg-foreground/45 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:duration-overlay data-[state=closed]:duration-fast",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const groessen = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
} as const;

/**
 * Dialog v3: 14-px-Radius, kein Rahmen, kein Blur. Polsterung liegt in
 * Header/Body/Footer (`data-slot`); Aufrufe ohne diese Bausteine bekommen
 * sie über die Fallback-Regel, damit v2-Dialoge nicht randlos werden.
 */
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { size?: keyof typeof groessen }
>(({ className, children, size = "md", ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      onKeyDown={(e) => {
        // ⌘Enter löst den als `data-primary` markierten Button im Fuß aus.
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          const ziel = e.currentTarget.querySelector<HTMLButtonElement>("[data-primary]");
          if (ziel) {
            e.preventDefault();
            ziel.click();
          }
        }
        props.onKeyDown?.(e);
      }}
      className={cn(
        "fixed left-1/2 top-1/2 z-dialog grid w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-0 rounded-2xl bg-card p-0 shadow-lg",
        groessen[size],
        "[&>*:not([data-slot])]:px-5 [&>*:not([data-slot]):first-child]:pt-5 [&>*:not([data-slot]):last-child]:pb-5",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-[0.985] data-[state=open]:zoom-in-[0.985] data-[state=open]:duration-overlay data-[state=closed]:duration-fast",
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors duration-fast hover:bg-surface-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none">
        <X className="h-4 w-4" strokeWidth={1.75} />
        <span className="sr-only">Schließen</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="header"
    className={cn("flex flex-col space-y-1 px-5 pb-3 pr-14 pt-5 text-left", className)}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

/** Scrollbarer Inhaltsbereich zwischen Kopf und Fuß. */
const DialogBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="body"
    className={cn("max-h-[70dvh] space-y-4 overflow-y-auto px-5 pb-5 scrollbar-thin", className)}
    {...props}
  />
);
DialogBody.displayName = "DialogBody";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="footer"
    className={cn(
      "flex flex-col-reverse gap-2 rounded-b-2xl border-t border-border bg-surface-muted/50 px-5 py-3 sm:flex-row sm:justify-end",
      className,
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-base font-semibold leading-6 text-foreground", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-13 text-muted-foreground", className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
