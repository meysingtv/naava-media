"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Toasts: weiß, feiner Rahmen, neutraler Schatten, 3-px-Farbkante links
 * je nach Typ. Keine `richColors` – die Farbe kommt nur von der Kante + Icon.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        duration: 3500,
        classNames: {
          toast:
            "group toast !font-sans !rounded-lg !border !border-border !bg-background !text-foreground !shadow-md !border-l-[3px] !border-l-border-strong !py-3 !pl-3.5 !pr-3",
          title: "!text-sm !font-medium !text-foreground",
          description: "!text-[13px] !text-muted-foreground",
          icon: "!text-muted-foreground",
          actionButton: "!bg-primary !text-primary-foreground !rounded-md !text-xs !font-medium",
          cancelButton: "!bg-surface-muted !text-foreground-secondary !rounded-md !text-xs !font-medium",
          closeButton: "!border-border !bg-background !text-muted-foreground hover:!bg-surface",
          success: "!border-l-success [&_svg]:!text-success",
          error: "!border-l-destructive [&_svg]:!text-destructive",
          warning: "!border-l-warning [&_svg]:!text-warning",
          info: "!border-l-primary [&_svg]:!text-primary",
          loading: "!border-l-primary [&_svg]:!text-primary",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
