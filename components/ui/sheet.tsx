"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Seitenpanel v3 (Sheet / Drawer rechts) – der Ort für Detailansichten,
 * Termin-Details und den KI-Assistenten. Bündig an der Fensterkante, also
 * ohne Radius; unter `sm` wird daraus ein Bottom-Sheet.
 *
 * Regel: Ein Dialog darf aus einem Sheet geöffnet werden, ein Sheet nicht
 * aus einem Dialog. Zwei Sheets gleichzeitig sind nicht erlaubt.
 */
const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-sheet bg-foreground/35 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:duration-overlay data-[state=closed]:duration-fast",
      className,
    )}
    {...props}
  />
));
SheetOverlay.displayName = "SheetOverlay";

const breiten = {
  sm: "sm:w-[400px]",
  md: "sm:w-[520px]",
  lg: "sm:w-[720px]",
  xl: "sm:w-[960px]",
} as const;

export interface SheetContentProps
  extends Omit<React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>, "title"> {
  side?: "right" | "left";
  size?: keyof typeof breiten;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Aktionen rechts im Kopf, links vom Schließen-Kreuz. */
  actions?: React.ReactNode;
  /** Kein Overlay (nur für den KI-Assistenten). */
  modal?: boolean;
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ className, children, side = "right", size = "md", title, description, actions, modal = true, ...props }, ref) => (
  <SheetPortal>
    {modal && <SheetOverlay />}
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed z-sheet flex flex-col bg-card shadow-lg duration-overlay",
        // Mobil: Bottom-Sheet mit Sicherheitsabstand am unteren Rand
        "inset-x-0 bottom-0 top-auto h-[92dvh] rounded-t-2xl pb-[env(safe-area-inset-bottom)]",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
        // Ab sm: bündiges Seitenpanel ohne Radius
        "sm:inset-y-0 sm:bottom-auto sm:top-0 sm:h-auto sm:max-w-full sm:rounded-none sm:pb-0",
        side === "right"
          ? "sm:left-auto sm:right-0 sm:data-[state=open]:slide-in-from-right sm:data-[state=closed]:slide-out-to-right"
          : "sm:right-auto sm:left-0 sm:data-[state=open]:slide-in-from-left sm:data-[state=closed]:slide-out-to-left",
        breiten[size],
        className,
      )}
      {...props}
    >
      {(title || actions) && (
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-5">
          <div className="min-w-0 flex-1">
            {title && (
              <DialogPrimitive.Title className="truncate text-base font-semibold leading-6 text-foreground">
                {title}
              </DialogPrimitive.Title>
            )}
            {description && (
              <DialogPrimitive.Description className="truncate text-13 text-foreground-tertiary">
                {description}
              </DialogPrimitive.Description>
            )}
          </div>
          {actions}
          <DialogPrimitive.Close className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors duration-fast hover:bg-surface-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <X className="h-[18px] w-[18px]" strokeWidth={1.75} />
            <span className="sr-only">Schließen</span>
          </DialogPrimitive.Close>
        </div>
      )}
      {children}
    </DialogPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = "SheetContent";

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex h-14 shrink-0 items-center gap-3 border-b border-border px-5", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex-1 overflow-y-auto px-5 py-4 scrollbar-thin", className)} {...props} />
);
SheetBody.displayName = "SheetBody";

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "sticky bottom-0 flex shrink-0 items-center justify-end gap-2 border-t border-border bg-card px-5 py-3",
      className,
    )}
    {...props}
  />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = DialogPrimitive.Title;
const SheetDescription = DialogPrimitive.Description;

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetPortal,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
