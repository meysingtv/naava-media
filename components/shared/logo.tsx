import { cn } from "@/lib/utils";

/**
 * Marke v2: Wortmarke mit Fahrbahn-Mark (zwei versetzte Spuren) – dezent,
 * ohne Auto-Illustration.
 */
export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-[15px] font-semibold tracking-tight text-foreground", className)}>
      <span
        aria-hidden="true"
        className="relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-[6px] bg-foreground"
      >
        <span className="absolute left-1.5 top-1.5 h-3 w-[3px] rounded-full bg-primary" />
        <span className="absolute left-[11px] top-[5px] h-[6px] w-[3px] rounded-full bg-primary/60" />
        <span className="absolute left-[11px] top-[14px] h-[5px] w-[3px] rounded-full bg-primary/60" />
        <span className="absolute left-4 top-1.5 h-3 w-[3px] rounded-full bg-primary" />
      </span>
      {!compact && (
        <span>
          Fahrschul<span className="text-primary">App</span>
        </span>
      )}
    </span>
  );
}
