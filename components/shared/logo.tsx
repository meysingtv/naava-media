import { Car } from "lucide-react";

import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground", className)}>
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Car className="h-3.5 w-3.5" strokeWidth={2.25} />
      </span>
      <span>
        Fahrschul<span className="text-primary">App</span>
      </span>
    </span>
  );
}
