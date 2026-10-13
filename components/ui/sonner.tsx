"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Toasts v3: weiße Fläche, 1-px-Ring, weicher Schatten, kein Rahmen und
 * keine Farbkante links (das war ein v2-Merkmal). Die Typfarbe trägt nur
 * noch das Icon.
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
            "group toast !font-sans !rounded-lg !border-0 !bg-card !text-foreground !shadow-lg !ring-1 !ring-black/[.06] !py-3 !pl-4 !pr-3",
          title: "!text-13 !font-medium !text-foreground",
          description: "!text-xs !text-muted-foreground",
          actionButton: "!bg-primary !text-primary-foreground !rounded-md !h-7 !px-2.5 !text-xs !font-medium",
          cancelButton: "!bg-surface-muted !text-foreground-secondary !rounded-md !h-7 !px-2.5 !text-xs !font-medium",
          closeButton: "!border-border !bg-card !text-muted-foreground hover:!bg-surface-muted",
          success: "[&_svg]:!text-success",
          error: "[&_svg]:!text-destructive",
          warning: "[&_svg]:!text-warning",
          info: "[&_svg]:!text-info",
          loading: "[&_svg]:!text-primary",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
