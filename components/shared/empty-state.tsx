import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Leerzustand v2: ruhige Fläche, kleines Icon, klare Handlung. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-xl border bg-card px-6 py-14 text-center", className)}>
      <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-surface-muted text-muted-foreground">
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1 max-w-[380px] text-xs text-muted-foreground">{description}</p>}
      {children && <div className="mt-4 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}
