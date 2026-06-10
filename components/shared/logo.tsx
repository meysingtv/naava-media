import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("text-lg font-bold tracking-tight text-foreground", className)}>
      Fahrschul<span className="text-primary">App</span>
    </span>
  );
}
