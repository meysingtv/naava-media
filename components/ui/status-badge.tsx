import * as React from "react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusTon = "neutral" | "primary" | "success" | "warning" | "destructive" | "info";

const tonZuVariante: Record<StatusTon, BadgeProps["variant"]> = {
  neutral: "secondary",
  primary: "default",
  success: "success",
  warning: "warning",
  destructive: "destructive",
  info: "info",
};

export interface StatusBadgeProps extends Omit<BadgeProps, "variant"> {
  /** Bedeutungston des Status – bestimmt Soft-Fläche, Textstufe und Punkt. */
  ton?: StatusTon;
  /** Alternativ direkt eine Badge-Variante (für Maps aus lib/constants). */
  variant?: BadgeProps["variant"];
  label?: React.ReactNode;
}

/**
 * Status-Pille v3: Punkt + Text auf Soft-Fläche. Der Text nutzt immer die
 * dunkle `*-text`-Stufe – Lesbarkeit hängt nie an der Markenfarbe.
 */
export function StatusBadge({ ton, variant, label, children, className, ...props }: StatusBadgeProps) {
  const gewaehlt = variant ?? tonZuVariante[ton ?? "neutral"];
  return (
    <Badge variant={gewaehlt} className={cn(className)} {...props}>
      {label ?? children}
    </Badge>
  );
}
